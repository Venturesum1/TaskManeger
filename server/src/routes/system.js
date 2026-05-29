const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { connectDB, isConnected } = require('../database/mongodb');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { success, fail, serverError } = require('../helpers');
const logger = require('../utils/logger');

// GET /api/system/email-health  — public health check
router.get('/email-health', async (req, res) => {
  try {
    await emailService.verifyConnection();
    return res.json({
      success: true,
      provider: process.env.EMAIL_PROVIDER || 'gmail',
      status: 'healthy',
      user: process.env.EMAIL_USER || 'not set',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[System] Email health check failed', { error: err.message });
    return res.status(503).json({
      success: false,
      provider: process.env.EMAIL_PROVIDER || 'gmail',
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/system/health  — full system health
router.get('/health', async (req, res) => {
  const status = {
    app: 'B4Utaskmanagement',
    version: '2.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    database: isConnected() ? 'connected' : 'disconnected',
    email: 'unknown',
    timestamp: new Date().toISOString(),
  };

  try { await connectDB(); status.database = 'connected'; } catch { status.database = 'failed'; }
  try { await emailService.verifyConnection(); status.email = 'healthy'; } catch (e) { status.email = `unhealthy: ${e.message}`; }

  const allHealthy = status.database === 'connected' && status.email === 'healthy';
  return res.status(allHealthy ? 200 : 503).json({ success: allHealthy, data: status });
});

// GET /api/system/email-stats  — admin only
router.get('/email-stats', requireAdmin, async (req, res) => {
  try {
    const stats = await emailService.getDailyStats();
    return success(res, stats);
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/system/email-failed  — admin only
router.get('/email-failed', requireAdmin, async (req, res) => {
  try {
    const failed = await emailService.getFailedEmails(Number(req.query.limit) || 20);
    return success(res, failed);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/system/email-resend/:id  — admin: requeue a failed email
router.post('/email-resend/:id', requireAdmin, async (req, res) => {
  try {
    await emailService.requeueEmail(req.params.id);
    return success(res, { message: 'Email requeued successfully' });
  } catch (err) {
    if (err.message === 'Queue item not found') return fail(res, err.message, 404);
    return serverError(res, err);
  }
});

// POST /api/system/email-test  — admin: send test email immediately
router.post('/email-test', requireAdmin, async (req, res) => {
  try {
    const to = req.body.to || process.env.ADMIN_EMAIL;
    if (!to) return fail(res, 'Provide "to" email address in request body');
    await emailService.sendTestEmail({ to });
    return success(res, { message: `Test email sent to ${to}` });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
