const authService = require('../services/authService');
const jwtConfig = require('../config/jwt');
const { success, fail, serverError } = require('../helpers');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim())
      return fail(res, 'Email and password are required');

    const { token, user } = await authService.login(email, password, req);
    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions());
    return success(res, user);
  } catch (err) {
    if (err.statusCode === 401) return fail(res, err.message, 401);
    if (err.statusCode === 403) return fail(res, err.message, 403);
    return serverError(res, err);
  }
}

function logout(req, res) {
  res.clearCookie(jwtConfig.cookieName, { path: '/' });
  return success(res, null);
}

async function me(req, res) {
  try {
    const user = await authService.getMe(req.auth.userId);
    return success(res, user);
  } catch (err) {
    if (err.statusCode === 404) return fail(res, err.message, 404);
    return serverError(res, err);
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return fail(res, 'currentPassword and newPassword are required');
    await authService.changePassword(req.auth.userId, currentPassword, newPassword, req);
    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message, 400);
    if (err.statusCode === 404) return fail(res, err.message, 404);
    return serverError(res, err);
  }
}

module.exports = { login, logout, me, changePassword };
