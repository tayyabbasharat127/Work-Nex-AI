require('dotenv').config();
require('express-async-errors');

// Apply any pending Prisma migrations before anything else touches the
// database — so pointing the backend at a brand-new, empty database and
// starting it (however it's started: node, npm start, nodemon, a process
// manager) is enough to get a fully migrated schema, with no manual
// `prisma migrate deploy` step. Idempotent: a no-op (~1s) once everything is
// already applied, so it's safe to run on every single boot, not just first.
{
  const { execSync } = require('child_process');
  try {
    console.log('[startup] Applying pending Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: __dirname + '/..' });
    console.log('[startup] Database schema is up to date.');
  } catch (err) {
    console.error('[startup] Prisma migration failed — refusing to start with a possibly out-of-sync schema.');
    console.error(err.message);
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');
const logger = require('./config/logger');
const prisma = require('./config/db');

// Start scheduled jobs
require('./jobs/scheduler');

// Start ETL scheduler
const etlScheduler = require('./modules/etl/etl.scheduler');
etlScheduler.start();

const app = express();
let databaseStatus = 'unknown';

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
    'http://192.168.100.7:3000',
    /^http:\/\/192\.168\./,
    /\.trycloudflare\.com$/,  // Allow all Cloudflare tunnels
  ].filter(Boolean),
  credentials: true,
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.API_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 2000 : 200)),
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? 500 : 20)),
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Public health check for load balancers and smoke tests.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'worknex-backend',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// Mock TMS server — simulates a biometric machine API for dev/demo
// In production: remove this and point TMS_API_URL to your real machine
if (process.env.NODE_ENV !== 'production') {
  app.use('/tms-mock', require('./modules/attendance/tms.mock'));
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

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
    logger.error('=== DATABASE NOT MIGRATED ===');
    logger.error('Missing tables: ' + missing.join(', '));
    logger.error('Run: cd worknex-backend && npm run db:setup');
    logger.error('=============================');
    process.exit(1);
  }
  databaseStatus = 'migrated';
  logger.info('Database migration check passed');
}

const startServer = async () => {
  try {
    await prisma.$connect();
    databaseStatus = 'connected';
    logger.info('Database connected successfully');

    await verifyMigrations();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`WorkNex AI Backend running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`Network access: http://192.168.100.7:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  etlScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  etlScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
