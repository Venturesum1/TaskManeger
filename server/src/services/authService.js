const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const User = require('../models/User');
const { connectDB } = require('../database/mongodb');
const logger = require('../utils/logger');

function signToken(payload) {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch {
    return null;
  }
}

function extractToken(req) {
  return (
    req.cookies?.[jwtConfig.cookieName] ||
    req.headers.authorization?.replace('Bearer ', '')
  );
}

function getAuthUser(req) {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

async function login(email, password) {
  await connectDB();
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  });

  logger.info('[Auth] Login successful', { email: user.email, role: user.role });
  return {
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, phone: user.phone },
  };
}

async function getMe(userId) {
  await connectDB();
  const user = await User.findById(userId).select('-password').lean();
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user;
}

module.exports = { signToken, verifyToken, getAuthUser, login, getMe };
