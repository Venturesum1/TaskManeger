require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./src/utils/logger');
const { connectDB } = require('./src/database/mongodb');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorMiddleware');
const emailService = require('./src/services/emailService');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn('[CORS] Blocked origin', { origin });
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./src/routes/auth'));
app.use('/api/tasks',         require('./src/routes/tasks'));
app.use('/api/meetings',      require('./src/routes/meetings'));
app.use('/api/users',         require('./src/routes/team'));
app.use('/api/team',          require('./src/routes/team'));
app.use('/api/settings',      require('./src/routes/settings'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/send-reminder', require('./src/routes/sendReminder'));
app.use('/api/health',        require('./src/routes/health'));
app.use('/api/system',        require('./src/routes/system'));

app.get('/', (req, res) =>
  res.json({ success: true, message: 'B4Utaskmanagement API', version: '2.0.0' })
);

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Startup ───────────────────────────────────────────────────────────────

async function boot() {
  logger.info('[Server] Starting B4Utaskmanagement...');

  // 1. MongoDB
  try {
    await connectDB();
    logger.info('[Server] ✓ MongoDB connected');
  } catch (err) {
    logger.error('[Server] ✗ MongoDB connection failed', { error: err.message });
    process.exit(1);
  }

  // 2. Email SMTP
  const skipEmailVerify = process.env.SKIP_EMAIL_VERIFY === 'true';
  try {
    await emailService.verifyConnection();
    logger.info('[Server] ✓ Email SMTP verified');
  } catch (err) {
    if (skipEmailVerify) {
      logger.warn('[Server] ⚠ Email SMTP unavailable (SKIP_EMAIL_VERIFY=true) — continuing anyway', { error: err.message });
    } else {
      logger.error('[Server] ✗ Email SMTP verification failed — set SKIP_EMAIL_VERIFY=true to bypass', { error: err.message });
      process.exit(1);
    }
  }

  // 3. Start cron jobs
  require('./src/jobs/deadlineReminderJob').start();
  require('./src/jobs/meetingReminderJob').start();
  require('./src/jobs/emailQueueProcessor').start();
  logger.info('[Server] ✓ Cron jobs started (deadline, meeting reminder, email queue)');

  // 4. Listen
  app.listen(PORT, () => {
    logger.info(`[Server] ✓ Running on port ${PORT}`);
    logger.info(`[Server]   Environment : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`[Server]   Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
    logger.info(`[Server]   Email user  : ${process.env.EMAIL_USER || 'not set'}`);
  });
}

boot();
