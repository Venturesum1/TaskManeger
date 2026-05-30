const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtConfig = require('../config/jwt');
const User = require('../models/User');
const LoginAuditLog = require('../models/LoginAuditLog');
const { connectDB } = require('../database/mongodb');
const logger = require('../utils/logger');

const MAX_FAILED_ATTEMPTS = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

function verifyToken(token) {
  try { return jwt.verify(token, jwtConfig.secret); }
  catch { return null; }
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

function getIP(req) {
  return (
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    ''
  );
}

function validatePassword(password) {
  if (!password || password.length < 8)       return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password))                return 'Must contain at least one uppercase letter';
  if (!/[a-z]/.test(password))                return 'Must contain at least one lowercase letter';
  if (!/[0-9]/.test(password))                return 'Must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password))         return 'Must contain at least one special character (@#$!%*?&...)';
  return null;
}

function generateTempPassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@#$!%*?&';
  const all = upper + lower + digits + special;
  const pwd = [
    upper  [Math.floor(Math.random() * upper.length)],
    lower  [Math.floor(Math.random() * lower.length)],
    digits [Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 4; i++) pwd.push(all[Math.floor(Math.random() * all.length)]);
  return pwd.sort(() => Math.random() - 0.5).join('');
}

async function writeLoginAudit(fields) {
  try { await LoginAuditLog.create(fields); }
  catch (err) { logger.warn('[Auth] Audit log failed', { error: err.message }); }
}

// ── Login ────────────────────────────────────────────────────────────────────

async function login(email, password, req) {
  await connectDB();
  const ip = getIP(req);
  const userAgent = req?.headers?.['user-agent'] || '';

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (user.isLocked) {
    await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'failed_login', ipAddress: ip, userAgent, detail: 'Account locked' });
    throw Object.assign(new Error('Account is locked. Contact your admin.'), { statusCode: 403, code: 'ACCOUNT_LOCKED' });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const willLock = attempts >= MAX_FAILED_ATTEMPTS;
    await User.findByIdAndUpdate(user._id, {
      failedLoginAttempts: attempts,
      ...(willLock ? { isLocked: true, lockedAt: new Date() } : {}),
    });

    await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'failed_login', ipAddress: ip, userAgent, detail: `Attempt ${attempts}${willLock ? ' — account locked' : ''}` });

    if (willLock) {
      logger.warn('[Auth] Account locked', { email: user.email });
      throw Object.assign(new Error('Account locked after 5 failed attempts. Contact your admin.'), { statusCode: 403, code: 'ACCOUNT_LOCKED' });
    }
    throw Object.assign(new Error(`Invalid email or password. ${MAX_FAILED_ATTEMPTS - attempts} attempt(s) remaining.`), { statusCode: 401 });
  }

  // ── Successful login ──────────────────────────────────────────────────────
  await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lastLogin: new Date() });
  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'login', ipAddress: ip, userAgent });

  const requiresPasswordChange = !!(user.isFirstLogin || user.forcePasswordChange);

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  });

  logger.info('[Auth] Login successful', { email: user.email, role: user.role, requiresPasswordChange });

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isFirstLogin: user.isFirstLogin,
      forcePasswordChange: user.forcePasswordChange,
      requiresPasswordChange,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    },
  };
}

// ── Change password (first-login + regular) ───────────────────────────────────

async function changePassword(userId, currentPassword, newPassword, req) {
  await connectDB();
  const ip = getIP(req);

  const validationError = validatePassword(newPassword);
  if (validationError) throw Object.assign(new Error(validationError), { statusCode: 400 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });

  if (currentPassword === newPassword) {
    throw Object.assign(new Error('New password must be different from current password'), { statusCode: 400 });
  }

  user.password           = newPassword; // pre-save hook hashes it
  user.isFirstLogin       = false;
  user.forcePasswordChange = false;
  user.passwordChangedAt  = new Date();
  user.failedLoginAttempts = 0;
  await user.save();

  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'password_changed', ipAddress: ip });
  logger.info('[Auth] Password changed', { userId });
}

// ── Admin: reset password ─────────────────────────────────────────────────────

async function adminResetPassword(targetUserId, adminId) {
  await connectDB();
  const user = await User.findById(targetUserId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const tempPassword = generateTempPassword();
  user.password            = tempPassword;
  user.isFirstLogin        = true;
  user.forcePasswordChange = true;
  user.passwordChangedAt   = null;
  user.failedLoginAttempts = 0;
  user.isLocked            = false;
  await user.save();

  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'password_reset', performedBy: adminId, detail: 'Admin reset password' });
  logger.info('[Auth] Admin reset password', { targetUserId, adminId });

  return { tempPassword };
}

// ── Admin: force password change ──────────────────────────────────────────────

async function adminForcePasswordChange(targetUserId, adminId) {
  await connectDB();
  const user = await User.findByIdAndUpdate(targetUserId, { forcePasswordChange: true }, { new: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'force_password_change', performedBy: adminId });
}

// ── Admin: lock / unlock ──────────────────────────────────────────────────────

async function adminLockUser(targetUserId, adminId) {
  await connectDB();
  const user = await User.findByIdAndUpdate(targetUserId, { isLocked: true, lockedAt: new Date() }, { new: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'account_locked', performedBy: adminId, detail: 'Manually locked by admin' });
}

async function adminUnlockUser(targetUserId, adminId) {
  await connectDB();
  const user = await User.findByIdAndUpdate(targetUserId, { isLocked: false, lockedAt: null, failedLoginAttempts: 0 }, { new: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action: 'account_unlocked', performedBy: adminId });
}

// ── Admin: activate / deactivate ─────────────────────────────────────────────

async function adminSetActive(targetUserId, isActive, adminId) {
  await connectDB();
  const user = await User.findByIdAndUpdate(targetUserId, { isActive }, { new: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  const action = isActive ? 'account_activated' : 'account_deactivated';
  await writeLoginAudit({ userId: user._id, userName: user.name, userEmail: user.email, action, performedBy: adminId });
}

// ── Login history ─────────────────────────────────────────────────────────────

async function getLoginHistory(userId, { limit = 20, skip = 0 } = {}) {
  await connectDB();
  const [logs, total] = await Promise.all([
    LoginAuditLog.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    LoginAuditLog.countDocuments({ userId }),
  ]);
  return { logs, total };
}

async function getMe(userId) {
  await connectDB();
  const user = await User.findById(userId).select('-password').lean();
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user;
}

module.exports = {
  signToken, verifyToken, getAuthUser, getIP,
  validatePassword, generateTempPassword,
  login, changePassword, getMe,
  adminResetPassword, adminForcePasswordChange,
  adminLockUser, adminUnlockUser, adminSetActive,
  getLoginHistory,
};
