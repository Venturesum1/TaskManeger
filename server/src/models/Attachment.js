const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true }, // bytes
  path: { type: String, required: true },
}, { timestamps: true });

AttachmentSchema.index({ task: 1 });

module.exports = mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
