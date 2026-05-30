const Role = require('../models/Role');
const RolePermission = require('../models/RolePermission');
const UserPermission = require('../models/UserPermission');
const AuditLog = require('../models/AuditLog');
const { connectDB } = require('../database/mongodb');
const { PERMISSIONS, ROLE_DEFAULTS, ALL_KEYS } = require('../constants/permissions');
const logger = require('../utils/logger');

// ─── Audit ──────────────────────────────────────────────────────────────────

async function writeAudit(action, actor, target, detail) {
  try {
    await AuditLog.create({
      action,
      performedBy: actor.id,
      performedByName: actor.name || '',
      target: String(target),
      detail,
    });
  } catch (err) {
    logger.warn('[Audit] Failed to write audit log', { action, error: err.message });
  }
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function seedDefaults() {
  await connectDB();
  const SYSTEM_ROLES = [
    { name: 'admin',   label: 'Admin',       isSystem: true },
    { name: 'manager', label: 'Manager',      isSystem: true },
    { name: 'member',  label: 'Team Member',  isSystem: true },
    { name: 'client',  label: 'Client',       isSystem: true },
  ];

  for (const role of SYSTEM_ROLES) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { $setOnInsert: { ...role, isActive: true, description: '' } },
      { upsert: true }
    );

    const defaultEnabled = ROLE_DEFAULTS[role.name] || [];
    const ops = PERMISSIONS.map(p => ({
      updateOne: {
        filter: { roleName: role.name, permissionKey: p.key },
        update: { $setOnInsert: { roleName: role.name, permissionKey: p.key, enabled: defaultEnabled.includes(p.key) } },
        upsert: true,
      },
    }));
    if (ops.length) await RolePermission.bulkWrite(ops);
  }
  logger.info('[PermissionService] ✓ Default roles and permissions seeded');
}

// ─── Get effective permissions for a user ──────────────────────────────────

async function getUserPermissions(userId, roleName) {
  await connectDB();

  // Admin always gets all permissions (safety net — even if DB is misconfigured)
  if (roleName === 'admin') {
    return ALL_KEYS.reduce((acc, k) => { acc[k] = true; return acc; }, {});
  }

  const [rolePerms, userPerms] = await Promise.all([
    RolePermission.find({ roleName }).lean(),
    UserPermission.find({ userId }).lean(),
  ]);

  // Start with all permissions disabled
  const map = ALL_KEYS.reduce((acc, k) => { acc[k] = false; return acc; }, {});

  // Apply role permissions
  for (const rp of rolePerms) {
    if (map.hasOwnProperty(rp.permissionKey)) {
      map[rp.permissionKey] = rp.enabled;
    }
  }

  // Apply user-level overrides (takes precedence)
  for (const up of userPerms) {
    if (map.hasOwnProperty(up.permissionKey)) {
      map[up.permissionKey] = up.enabled;
    }
  }

  return map;
}

// ─── Check a single permission (used by middleware) ─────────────────────────

async function checkPermission(userId, roleName, permissionKey) {
  if (roleName === 'admin') return true;
  await connectDB();

  // Check user override first
  const userOverride = await UserPermission.findOne({ userId, permissionKey }).lean();
  if (userOverride) return userOverride.enabled;

  // Fall back to role permission
  const rolePerm = await RolePermission.findOne({ roleName, permissionKey }).lean();
  return rolePerm ? rolePerm.enabled : false;
}

// ─── Role CRUD ──────────────────────────────────────────────────────────────

async function listRoles() {
  await connectDB();
  return Role.find({ isActive: true }).sort({ isSystem: -1, name: 1 }).lean();
}

async function createRole({ name, label, description }, actor) {
  await connectDB();
  const safeName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!safeName) throw Object.assign(new Error('Invalid role name'), { statusCode: 400 });

  const exists = await Role.findOne({ name: safeName });
  if (exists) throw Object.assign(new Error('Role already exists'), { statusCode: 409 });

  const role = await Role.create({ name: safeName, label: label || name, description: description || '', isSystem: false });

  const memberDefaults = ROLE_DEFAULTS.member;
  const ops = PERMISSIONS.map(p => ({
    updateOne: {
      filter: { roleName: safeName, permissionKey: p.key },
      update: { $setOnInsert: { roleName: safeName, permissionKey: p.key, enabled: memberDefaults.includes(p.key) } },
      upsert: true,
    },
  }));
  if (ops.length) await RolePermission.bulkWrite(ops);

  if (actor) await writeAudit('role.created', actor, safeName, { label, description });
  return role;
}

async function deleteRole(name, actor) {
  await connectDB();
  const role = await Role.findOne({ name });
  if (!role) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
  if (role.isSystem) throw Object.assign(new Error('Cannot delete system roles'), { statusCode: 403 });

  await Promise.all([
    Role.deleteOne({ name }),
    RolePermission.deleteMany({ roleName: name }),
  ]);
  if (actor) await writeAudit('role.deleted', actor, name, { label: role.label });
}

// ─── Role Permission Management ─────────────────────────────────────────────

async function getRolePermissions(roleName) {
  await connectDB();
  const perms = await RolePermission.find({ roleName }).lean();
  const map = {};
  for (const p of perms) map[p.permissionKey] = p.enabled;
  return map;
}

async function updateRolePermission(roleName, permissionKey, enabled, actor) {
  await connectDB();
  await RolePermission.findOneAndUpdate(
    { roleName, permissionKey },
    { $set: { enabled } },
    { upsert: true }
  );
  if (actor) await writeAudit('role_permission.toggled', actor, roleName, { permissionKey, enabled });
}

async function bulkUpdateRolePermissions(roleName, updates, actor) {
  await connectDB();
  const ops = updates.map(u => ({
    updateOne: {
      filter: { roleName, permissionKey: u.key },
      update: { $set: { enabled: u.enabled } },
      upsert: true,
    },
  }));
  if (ops.length) await RolePermission.bulkWrite(ops);
  if (actor) await writeAudit('role_permission.bulk_updated', actor, roleName, { count: updates.length, updates });
}

// ─── User Permission Overrides ───────────────────────────────────────────────

async function getUserOverrides(userId) {
  await connectDB();
  const overrides = await UserPermission.find({ userId }).lean();
  const map = {};
  for (const o of overrides) map[o.permissionKey] = o.enabled;
  return map;
}

async function setUserOverride(userId, permissionKey, enabled, actor) {
  await connectDB();
  await UserPermission.findOneAndUpdate(
    { userId, permissionKey },
    { $set: { enabled } },
    { upsert: true }
  );
  if (actor) await writeAudit('user_permission.set', actor, String(userId), { permissionKey, enabled });
}

async function clearUserOverride(userId, permissionKey, actor) {
  await connectDB();
  await UserPermission.deleteOne({ userId, permissionKey });
  if (actor) await writeAudit('user_permission.cleared', actor, String(userId), { permissionKey });
}

async function clearAllUserOverrides(userId, actor) {
  await connectDB();
  await UserPermission.deleteMany({ userId });
  if (actor) await writeAudit('user_permission.all_cleared', actor, String(userId), {});
}

async function getAuditLogs({ limit = 50, skip = 0 } = {}) {
  await connectDB();
  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(),
  ]);
  return { logs, total };
}

module.exports = {
  seedDefaults,
  getUserPermissions,
  checkPermission,
  listRoles,
  createRole,
  deleteRole,
  getRolePermissions,
  updateRolePermission,
  bulkUpdateRolePermissions,
  getUserOverrides,
  setUserOverride,
  clearUserOverride,
  clearAllUserOverrides,
  getAuditLogs,
};
