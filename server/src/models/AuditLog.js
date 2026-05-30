const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'role.created', 'role.updated', 'role.deleted',
      'role_permission.toggled', 'role_permission.bulk_updated',
      'user_permission.set', 'user_permission.cleared', 'user_permission.all_cleared',
    ],
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String, default: '' },
  target: { type: String, default: '' },           // roleName or userId
  detail: { type: mongoose.Schema.Types.Mixed },   // arbitrary diff object
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ performedBy: 1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
