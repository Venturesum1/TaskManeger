const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, enum: ['task', 'meeting', 'user', 'comment', 'attachment', 'system', 'project', 'milestone'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  entityTitle: { type: String, default: '' },
  details: { type: String, default: '' },
}, { timestamps: true });

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
