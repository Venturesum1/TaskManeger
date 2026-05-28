const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_change_in_production';
const COOKIE_NAME = 'tf_token';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function getAuthUser(req) {
  const token =
    req.cookies?.[COOKIE_NAME] ||
    req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 24 * 7 * 1000,
    path: '/',
  };
}

module.exports = { signToken, verifyToken, getAuthUser, cookieOptions, COOKIE_NAME };
