const authService = require('../services/authService');
const jwtConfig = require('../config/jwt');
const { success, fail, serverError } = require('../helpers');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim())
      return fail(res, 'Email and password are required');

    const { token, user } = await authService.login(email, password);
    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions());
    return success(res, user);
  } catch (err) {
    if (err.statusCode === 401) return fail(res, err.message, 401);
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

module.exports = { login, logout, me };
