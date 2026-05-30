const User = require('../models/User');
const { connectDB } = require('../database/mongodb');
const { validatePassword } = require('./authService');
const emailService = require('./emailService');
const logger = require('../utils/logger');

async function listMembers() {
  await connectDB();
  return User.find()
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();
}

async function createMember({ name, email, password, role, department, phone }, createdById) {
  await connectDB();
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw Object.assign(new Error('Name, email, and password are required'), { statusCode: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) throw Object.assign(new Error(passwordError), { statusCode: 400 });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

  const plainPassword = password;

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    role: role || 'member',
    department,
    phone,
    isFirstLogin: true,
    forcePasswordChange: false,
    createdBy: createdById || null,
  });

  emailService.sendWelcomeEmail({
    to: user.email,
    name: user.name,
    password: plainPassword,
    role: user.role,
  }).catch((err) => logger.error('[TeamService] Welcome email failed', { error: err.message }));

  logger.info('[TeamService] Member created', { userId: user._id, email: user.email });
  return {
    _id: user._id, name: user.name, email: user.email,
    role: user.role, department: user.department,
    isFirstLogin: user.isFirstLogin, isActive: user.isActive,
  };
}

async function updateMember(id, { name, role, department, phone }) {
  await connectDB();
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { name, role, department, phone } },
    { new: true }
  ).select('-password').lean();
  if (!user) throw Object.assign(new Error('Member not found'), { statusCode: 404 });
  logger.info('[TeamService] Member updated', { userId: id });
  return user;
}

async function removeMember(id) {
  await connectDB();
  await User.findByIdAndDelete(id);
  logger.info('[TeamService] Member removed', { userId: id });
}

module.exports = { listMembers, createMember, updateMember, removeMember };
