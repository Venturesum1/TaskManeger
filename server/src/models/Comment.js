const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

CommentSchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
