const { getAuthUser } = require('../services/authService');
const { unauthorized, forbidden } = require('../helpers');

function requireAuth(req, res, next) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized(res);
  req.auth = auth;
  next();
}

function requireAdmin(req, res, next) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized(res);
  if (auth.role !== 'admin') return forbidden(res);
  req.auth = auth;
  next();
}

module.exports = { requireAuth, requireAdmin };
