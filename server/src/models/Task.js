const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'blocked', 'delayed'],
    default: 'not_started',
  },
  startDate: { type: Date },
  endDate: { type: Date },
  milestone: { type: String, default: '' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  estimatedHours: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
