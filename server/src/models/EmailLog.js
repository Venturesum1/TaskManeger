const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
  recipient:    { type: String, required: true, trim: true },
  subject:      { type: String, required: true },
  template:     { type: String, default: 'custom' },
  provider:     { type: String, default: 'gmail' },
  status:       { type: String, enum: ['sent', 'failed'], required: true },
  messageId:    { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  queueId:      { type: mongoose.Schema.Types.ObjectId, ref: 'EmailQueue' },
  timestamp:    { type: Date, default: Date.now },
}, { timestamps: false, collection: 'email_logs' });

EmailLogSchema.index({ recipient: 1, timestamp: -1 });
EmailLogSchema.index({ status: 1, timestamp: -1 });
EmailLogSchema.index({ timestamp: -1 });

module.exports = mongoose.models.EmailLog || mongoose.model('EmailLog', EmailLogSchema);
