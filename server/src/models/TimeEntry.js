const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date },
  stoppedAt: { type: Date },
  duration: { type: Number, default: 0 }, // seconds
  isRunning: { type: Boolean, default: false },
}, { timestamps: true });

TimeEntrySchema.index({ task: 1, user: 1 });

module.exports = mongoose.models.TimeEntry || mongoose.model('TimeEntry', TimeEntrySchema);
