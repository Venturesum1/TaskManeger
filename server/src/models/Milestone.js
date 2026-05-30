const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'delayed'],
    default: 'not_started',
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

MilestoneSchema.index({ projectId: 1 });
MilestoneSchema.index({ status: 1 });

module.exports = mongoose.models.Milestone || mongoose.model('Milestone', MilestoneSchema);
