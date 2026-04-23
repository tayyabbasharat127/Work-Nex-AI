require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

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

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());

// CORS Configuration - Allow frontend to access backend
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://192.168.100.7:3000',
    ];
    
    // Check if origin is in allowed list or matches LAN IP pattern
    if (allowedOrigins.includes(origin) || /^http:\/\/192\.168\./.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// Mock TMS server — simulates a biometric machine API for dev/demo
// In production: remove this and point TMS_API_URL to your real machine
if (process.env.NODE_ENV !== 'production') {
  app.use('/tms-mock', require('./modules/attendance/tms.mock'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'WorkNex AI Backend', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

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
