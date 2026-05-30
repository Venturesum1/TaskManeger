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
app.use('/api/tasks/:taskId/comments',    require('./src/routes/comments'));
app.use('/api/tasks/:taskId/time',        require('./src/routes/timeEntries'));
app.use('/api/tasks/:taskId/attachments', require('./src/routes/attachments'));
app.use('/api/meetings',      require('./src/routes/meetings'));
app.use('/api/users',         require('./src/routes/team'));
app.use('/api/team',          require('./src/routes/team'));
app.use('/api/settings',      require('./src/routes/settings'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/send-reminder', require('./src/routes/sendReminder'));
app.use('/api/activities',    require('./src/routes/activities'));
app.use('/api/analytics',     require('./src/routes/analytics'));
app.use('/api/projects',      require('./src/routes/projects'));
app.use('/api/milestones',    require('./src/routes/milestones'));
app.use('/api/workload',      require('./src/routes/workload'));
app.use('/api/permissions',   require('./src/routes/permissions'));
app.use('/api/health',        require('./src/routes/health'));
app.use('/api/system',        require('./src/routes/system'));
app.use('/uploads',           require('express').static(require('path').join(__dirname, 'uploads')));

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

  // 2. Email SMTP — warn only, never crash (queue processor handles retries)
  try {
    await emailService.verifyConnection();
    logger.info('[Server] ✓ Email SMTP verified');
  } catch (err) {
    logger.warn('[Server] ⚠ Email SMTP unavailable — server starting anyway, emails will retry via queue', { error: err.message });
  }

  // 2b. Seed permission defaults (idempotent — safe to run every boot)
  try {
    await require('./src/services/permissionService').seedDefaults();
  } catch (err) {
    logger.warn('[Server] ⚠ Permission seed failed', { error: err.message });
  }

  // 3. Start cron jobs
  require('./src/jobs/deadlineReminderJob').start();
  require('./src/jobs/meetingReminderJob').start();
  require('./src/jobs/emailQueueProcessor').start();
  require('./src/jobs/automationJob').start();
  logger.info('[Server] ✓ Cron jobs started (deadline, meeting reminder, email queue, automation)');

  // 4. Listen
  app.listen(PORT, () => {
    logger.info(`[Server] ✓ Running on port ${PORT}`);
    logger.info(`[Server]   Environment : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`[Server]   Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
    logger.info(`[Server]   Email user  : ${process.env.EMAIL_USER || 'not set'}`);
  });
}

boot();
