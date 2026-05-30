const permissionService = require('../services/permissionService');
const { PERMISSIONS } = require('../constants/permissions');
const { success, created, fail, notFound, forbidden, serverError } = require('../helpers');

// GET /api/permissions/my — effective permissions for current user
async function myPermissions(req, res) {
  try {
    const perms = await permissionService.getUserPermissions(req.auth.userId, req.auth.role);
    return success(res, perms);
  } catch (err) {
    return serverError(res, err);
  }
}

// GET /api/permissions/definitions — all permission definitions
function definitions(req, res) {
  return success(res, PERMISSIONS);
}

// ─── Roles ─────────────────────────────────────────────────────────────────

async function listRoles(req, res) {
  try {
    const roles = await permissionService.listRoles();
    return success(res, roles);
  } catch (err) {
    return serverError(res, err);
  }
}

async function createRole(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const role = await permissionService.createRole(req.body, req.auth);
    return created(res, role);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    if (err.statusCode === 409) return fail(res, err.message, 409);
    return serverError(res, err);
  }
}

async function deleteRole(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    await permissionService.deleteRole(req.params.roleName, req.auth);
    return success(res, null);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Role');
    if (err.statusCode === 403) return fail(res, err.message, 403);
    return serverError(res, err);
  }
}

// ─── Role Permissions ───────────────────────────────────────────────────────

async function getRolePermissions(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const perms = await permissionService.getRolePermissions(req.params.roleName);
    return success(res, perms);
  } catch (err) {
    return serverError(res, err);
  }
}

// PATCH /api/permissions/roles/:roleName — bulk update permissions for a role
async function updateRolePermissions(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const { updates } = req.body; // [{ key, enabled }]
    if (!Array.isArray(updates)) return fail(res, 'updates must be an array');
    await permissionService.bulkUpdateRolePermissions(req.params.roleName, updates, req.auth);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

// PATCH /api/permissions/roles/:roleName/:permKey — toggle single permission
async function toggleRolePermission(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return fail(res, 'enabled must be a boolean');
    await permissionService.updateRolePermission(req.params.roleName, req.params.permKey, enabled, req.auth);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

// ─── User Permission Overrides ──────────────────────────────────────────────

async function getUserOverrides(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const overrides = await permissionService.getUserOverrides(req.params.userId);
    return success(res, overrides);
  } catch (err) {
    return serverError(res, err);
  }
}

async function setUserOverride(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const { permissionKey, enabled } = req.body;
    if (!permissionKey || typeof enabled !== 'boolean') return fail(res, 'permissionKey and enabled required');
    await permissionService.setUserOverride(req.params.userId, permissionKey, enabled, req.auth);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

async function clearUserOverride(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    await permissionService.clearUserOverride(req.params.userId, req.params.permKey, req.auth);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

async function clearAllUserOverrides(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    await permissionService.clearAllUserOverrides(req.params.userId, req.auth);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

async function getAuditLogs(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = parseInt(req.query.skip) || 0;
    const result = await permissionService.getAuditLogs({ limit, skip });
    return success(res, result);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = {
  myPermissions, definitions,
  listRoles, createRole, deleteRole,
  getRolePermissions, updateRolePermissions, toggleRolePermission,
  getUserOverrides, setUserOverride, clearUserOverride, clearAllUserOverrides,
  getAuditLogs,
};
