const mongoose = require('mongoose');

const RolePermissionSchema = new mongoose.Schema({
  roleName: { type: String, required: true, lowercase: true },
  permissionKey: { type: String, required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

RolePermissionSchema.index({ roleName: 1, permissionKey: 1 }, { unique: true });
RolePermissionSchema.index({ roleName: 1 });

module.exports = mongoose.models.RolePermission || mongoose.model('RolePermission', RolePermissionSchema);
