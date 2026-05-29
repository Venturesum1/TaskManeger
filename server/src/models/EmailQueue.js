const mongoose = require('mongoose');

const RETRY_DELAYS_MINUTES = [0, 1, 5, 15];

const EmailQueueSchema = new mongoose.Schema({
  recipient:   { type: String, required: true, trim: true },
  subject:     { type: String, required: true },
  template:    { type: String, required: true },
  html:        { type: String, required: true },
  status:      { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending' },
  attempts:    { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 4 },
  nextRetry:   { type: Date, default: Date.now },
  lastAttempt: { type: Date },
  lastError:   { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
}, { timestamps: false, collection: 'email_queue' });

EmailQueueSchema.index({ status: 1, nextRetry: 1 });

EmailQueueSchema.statics.getRetryDelay = function (attempts) {
  const minutes = RETRY_DELAYS_MINUTES[attempts] ?? 15;
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = mongoose.models.EmailQueue || mongoose.model('EmailQueue', EmailQueueSchema);
