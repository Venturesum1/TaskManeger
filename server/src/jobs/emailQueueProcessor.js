const cron = require('node-cron');
const { connectDB } = require('../database/mongodb');
const { getProvider } = require('../services/email/providers/gmailProvider');
const logger = require('../utils/logger');

const BATCH_SIZE = 10;

async function processQueue() {
  try {
    await connectDB();
    const EmailQueue = require('../models/EmailQueue');
    const EmailLog   = require('../models/EmailLog');

    // Claim a batch atomically to avoid duplicate processing
    const now = new Date();
    const items = await EmailQueue.find({
      status: { $in: ['pending', 'failed'] },
      nextRetry: { $lte: now },
      attempts: { $lt: 4 },
    }).limit(BATCH_SIZE).lean();

    if (items.length === 0) return;

    logger.info('[EmailQueueProcessor] Processing batch', { count: items.length });

    const ids = items.map(i => i._id);
    await EmailQueue.updateMany({ _id: { $in: ids } }, { $set: { status: 'processing' } });

    const provider = getProvider();

    for (const item of items) {
      const attempts = item.attempts + 1;
      try {
        const info = await provider.send({ to: item.recipient, subject: item.subject, html: item.html });

        await EmailQueue.findByIdAndUpdate(item._id, {
          status: 'sent',
          attempts,
          lastAttempt: new Date(),
          lastError: '',
        });

        await EmailLog.create({
          recipient: item.recipient,
          subject: item.subject,
          template: item.template,
          provider: 'gmail',
          status: 'sent',
          messageId: info.messageId || '',
          queueId: item._id,
        });

        logger.info('[EmailQueueProcessor] Sent', { recipient: item.recipient, subject: item.subject, attempt: attempts });

      } catch (err) {
        const isFinal = attempts >= 4;
        const nextRetry = isFinal ? null : EmailQueue.schema.statics
          ? new Date(Date.now() + [1, 5, 15][attempts - 1] * 60 * 1000)
          : new Date(Date.now() + 5 * 60 * 1000);

        await EmailQueue.findByIdAndUpdate(item._id, {
          status: isFinal ? 'failed' : 'pending',
          attempts,
          lastAttempt: new Date(),
          lastError: err.message,
          ...(nextRetry && { nextRetry }),
        });

        await EmailLog.create({
          recipient: item.recipient,
          subject: item.subject,
          template: item.template,
          provider: 'gmail',
          status: 'failed',
          errorMessage: err.message,
          queueId: item._id,
        });

        logger.error('[EmailQueueProcessor] Failed', {
          recipient: item.recipient,
          attempt: attempts,
          final: isFinal,
          error: err.message,
        });

        if (isFinal && process.env.ADMIN_EMAIL) {
          try {
            await provider.send({
              to: process.env.ADMIN_EMAIL,
              subject: `[EMAIL FAILED] ${item.subject}`,
              html: `<p>Email to <strong>${item.recipient}</strong> failed after 4 attempts.</p><p>Subject: ${item.subject}</p><p>Error: ${err.message}</p>`,
            });
          } catch { /* best-effort admin alert */ }
        }
      }
    }
  } catch (err) {
    logger.error('[EmailQueueProcessor] Processor error', { error: err.message });
  }
}

function start() {
  cron.schedule('* * * * *', processQueue);
  logger.info('[EmailQueueProcessor] Scheduled — runs every minute');
  processQueue();
}

module.exports = { start, processQueue };
