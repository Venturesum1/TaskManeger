require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./src/utils/logger');
const { connectDB } = require('./src/database/mongodb');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorMiddleware');

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

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/tasks', require('./src/routes/tasks'));
app.use('/api/meetings', require('./src/routes/meetings'));
app.use('/api/users', require('./src/routes/team'));
app.use('/api/team', require('./src/routes/team'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/send-reminder', require('./src/routes/sendReminder'));
app.use('/api/health', require('./src/routes/health'));

app.get('/', (req, res) =>
  res.json({ success: true, message: 'B4Utaskmanagement API is running', version: '2.0.0' })
);

app.use(notFoundHandler);
app.use(errorHandler);

async function boot() {
  try {
    await connectDB();
    logger.info('[Server] MongoDB connected');

    const deadlineJob = require('./src/jobs/deadlineReminderJob');
    const meetingJob = require('./src/jobs/meetingReminderJob');
    deadlineJob.start();
    meetingJob.start();

    app.listen(PORT, () => {
      logger.info(`[Server] B4Utaskmanagement API running on port ${PORT}`);
      logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`[Server] Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
    });
  } catch (err) {
    logger.error('[Server] Boot failed', { error: err.message });
    process.exit(1);
  }
}

boot();
