const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'task_due', 'task_overdue', 'task_assigned', 'task_updated', 'task_completed',
      'meeting_reminder', 'meeting_invite',
      'comment_mention', 'deadline_reminder',
      'milestone_completed', 'project_updated',
      'system_notification', 'general',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  metadata: {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    whatsappLink: { type: String },
    emailSent: { type: Boolean, default: false },
  },
}, { timestamps: true });

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
