const mongoose = require('mongoose');

// Per-user permission overrides — takes precedence over role permissions
const UserPermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permissionKey: { type: String, required: true },
  enabled: { type: Boolean, required: true },
}, { timestamps: true });

UserPermissionSchema.index({ userId: 1, permissionKey: 1 }, { unique: true });
UserPermissionSchema.index({ userId: 1 });

module.exports = mongoose.models.UserPermission || mongoose.model('UserPermission', UserPermissionSchema);
