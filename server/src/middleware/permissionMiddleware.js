const { checkPermission } = require('../services/permissionService');
const { forbidden, unauthorized } = require('../helpers');

function requirePermission(permissionKey) {
  return async (req, res, next) => {
    const auth = req.auth;
    if (!auth) return unauthorized(res);

    // Admin bypasses all permission checks
    if (auth.role === 'admin') return next();

    try {
      const allowed = await checkPermission(auth.userId, auth.role, permissionKey);
      if (!allowed) return forbidden(res);
      next();
    } catch (err) {
      return forbidden(res);
    }
  };
}

module.exports = { requirePermission };
