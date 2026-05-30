const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, lowercase: true },
  label: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Role || mongoose.model('Role', RoleSchema);
