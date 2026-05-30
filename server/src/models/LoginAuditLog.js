const mongoose = require('mongoose');

const LoginAuditLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:  { type: String, default: '' },
  userEmail: { type: String, default: '' },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'failed_login', 'logout',
      'password_changed', 'password_reset',
      'account_locked', 'account_unlocked',
      'account_deactivated', 'account_activated',
      'force_password_change',
    ],
  },
  ipAddress:  { type: String, default: '' },
  userAgent:  { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for admin actions
  detail:     { type: String, default: '' },
}, { timestamps: true });

LoginAuditLogSchema.index({ userId: 1, createdAt: -1 });
LoginAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.LoginAuditLog || mongoose.model('LoginAuditLog', LoginAuditLogSchema);
