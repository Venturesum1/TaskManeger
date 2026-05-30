const teamService = require('../services/teamService');
const authService = require('../services/authService');
const { success, created, fail, notFound, forbidden, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const members = await teamService.listMembers();
    return success(res, members);
  } catch (err) {
    return serverError(res, err);
  }
}

async function create(req, res) {
  try {
    const member = await teamService.createMember(req.body, req.auth.userId);
    return created(res, member);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    if (err.statusCode === 409) return fail(res, err.message, 409);
    if (err.code === 11000) return fail(res, 'Email already exists', 409);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const member = await teamService.updateMember(req.params.id, req.body);
    return success(res, member);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Member');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    await teamService.removeMember(req.params.id);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

// ── Admin actions ─────────────────────────────────────────────────────────────

async function resetPassword(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const { tempPassword } = await authService.adminResetPassword(req.params.id, req.auth.userId);
    return success(res, { tempPassword });
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'User');
    return serverError(res, err);
  }
}

async function forcePasswordChange(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    await authService.adminForcePasswordChange(req.params.id, req.auth.userId);
    return success(res, null);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'User');
    return serverError(res, err);
  }
}

async function lockUser(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    await authService.adminLockUser(req.params.id, req.auth.userId);
    return success(res, null);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'User');
    return serverError(res, err);
  }
}

async function unlockUser(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    await authService.adminUnlockUser(req.params.id, req.auth.userId);
    return success(res, null);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'User');
    return serverError(res, err);
  }
}

async function setActive(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const isActive = req.body.isActive === true;
    await authService.adminSetActive(req.params.id, isActive, req.auth.userId);
    return success(res, null);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'User');
    return serverError(res, err);
  }
}

async function loginHistory(req, res) {
  try {
    if (req.auth.role !== 'admin') return forbidden(res);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = parseInt(req.query.skip) || 0;
    const result = await authService.getLoginHistory(req.params.id, { limit, skip });
    return success(res, result);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = {
  list, create, update, remove,
  resetPassword, forcePasswordChange,
  lockUser, unlockUser, setActive, loginHistory,
};
