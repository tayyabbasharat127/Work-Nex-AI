require('express-async-errors');
const { config } = require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');
const logger = require('./config/logger');
const prisma = require('./config/db');
const { requestContextMiddleware } = require('./middleware/requestContext.middleware');
const { ensureSuperAdmin } = require('./bootstrap/ensureSuperAdmin');
const metrics = require('./services/metrics.service');

const app = express();
app.locals.databaseStatus = 'not-ready';

if (config.trustProxy !== 'false') {
  const numericTrustProxy = Number(config.trustProxy);
  app.set('trust proxy', Number.isInteger(numericTrustProxy) ? numericTrustProxy : config.trustProxy);
}

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(requestContextMiddleware);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS policy'));
  },
  credentials: true,
}));
app.use(compression());
app.use(cookieParser());

// ─── ZKTeco ADMS / iClock push endpoints ──────────────────────────────────
// Real terminal firmware (uFace 950, etc.) always talks to these 4 fixed
// paths — no /api/v1 prefix, no auth headers, plain-text body. Mounted
// ahead of the global JSON/urlencoded parsers below so this router's own
// text parser gets the raw body first.
{
  const iclockProvider = require('./modules/attendance/providers/iclock.provider');
  const iclockRouter = express.Router();
  iclockRouter.use(rateLimit({
    windowMs: 60 * 1000,
    max: config.iclockRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }));
  iclockRouter.use(express.text({ type: () => true, limit: '256kb' }));
  iclockRouter.get('/cdata', iclockProvider.handleHandshake);
  iclockRouter.post('/cdata', iclockProvider.handleDataPush);
  iclockRouter.get('/getrequest', iclockProvider.handleGetRequest);
  iclockRouter.post('/devicecmd', iclockProvider.handleDeviceCmd);
  iclockRouter.get('/ping', (req, res) => res.type('text/plain').status(200).send('OK'));
  app.use('/iclock', iclockRouter);
}

app.use(express.json({
  limit: '1mb',
  verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
    metrics.recordHttpRequest({
      method: req.method,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });
  next();
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.apiRateLimitMax,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.authRateLimitMax,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);
app.use('/api/v1/auth/2fa/validate', authLimiter);

const liveResponse = (req, res) => res.status(200).json({
  status: 'ok',
  service: 'worknex-backend',
  timestamp: new Date().toISOString(),
});

app.get('/health/live', liveResponse);
app.get('/health', (req, res) => {
  const ready = app.locals.databaseStatus === 'ready';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'not-ready',
    service: 'worknex-backend',
    timestamp: new Date().toISOString(),
    database: app.locals.databaseStatus,
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    app.locals.databaseStatus = 'ready';
    res.status(200).json({ status: 'ready', service: 'worknex-backend' });
  } catch {
    app.locals.databaseStatus = 'not-ready';
    res.status(503).json({ status: 'not-ready', service: 'worknex-backend' });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// Mock TMS server — simulates a biometric machine API for dev/demo
// In production: remove this and point TMS_API_URL to your real machine
if (!config.isProduction) {
  app.use('/tms-mock', require('./modules/attendance/tms.mock'));
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.port;
let server;

const PREFLIGHT_TABLES = ['Organization', 'User', 'Department', 'Attendance', 'LeaveRequest'];

async function verifyMigrations() {
  const missing = [];
  for (const table of PREFLIGHT_TABLES) {
    const rows = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS "exists"
    `;
    if (!rows[0]?.exists) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(`Database is missing required tables: ${missing.join(', ')}. Run npm run db:deploy before starting the service.`);
  }
  app.locals.databaseStatus = 'ready';
  logger.info('Database migration check passed');
}

const startServer = async () => {
  try {
    await prisma.$connect();
    app.locals.databaseStatus = 'connected';
    logger.info('Database connected successfully');

    await verifyMigrations();
    await ensureSuperAdmin();

    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`WorkNex AI Backend listening on port ${PORT} [${config.env}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) startServer();

const shutdown = async (signal) => {
  logger.info('Shutdown requested', { signal });
  app.locals.databaseStatus = 'not-ready';

  const forcedExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out', { signal });
    process.exit(1);
  }, config.shutdownTimeoutMs);
  forcedExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
  clearTimeout(forcedExit);
  logger.info('Graceful shutdown complete', { signal });
  process.exit(0);
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
