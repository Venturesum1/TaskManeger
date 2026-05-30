const Notification = require('../models/Notification');
const { connectDB } = require('../database/mongodb');
const { buildWhatsAppLink } = require('../helpers');
const logger = require('../utils/logger');

async function createNotification({ userId, type, title, message, metadata = {} }) {
  await connectDB();
  const notification = await Notification.create({ user: userId, type, title, message, metadata });
  logger.info('[Notification] Created', { userId, type, title });
  return notification;
}

async function getNotifications(userId, limit = 50) {
  await connectDB();
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function markRead(notificationId, userId) {
  await connectDB();
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  ).lean();
}

async function markAllRead(userId) {
  await connectDB();
  await Notification.updateMany({ user: userId, read: false }, { read: true });
}

async function getUnreadCount(userId) {
  await connectDB();
  return Notification.countDocuments({ user: userId, read: false });
}

async function sendEmailNotification({ email, subject, html }) {
  const emailService = require('./emailService');
  await emailService.sendEmail({ to: email, subject, html });
}

function sendBrowserNotification({ title, message, icon }) {
  return { type: 'browser', title, message, icon };
}

function generateWhatsAppLink(phone, message) {
  if (!phone) throw new Error('Phone number required for WhatsApp link');
  const link = buildWhatsAppLink(phone, message);
  logger.info('[Notification] WhatsApp link generated', { phone: phone.slice(-4) });
  return link;
}

async function deleteNotification(notificationId, userId) {
  await connectDB();
  await Notification.findOneAndDelete({ _id: notificationId, user: userId });
}

async function deleteOldNotifications(daysOld = 30) {
  await connectDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  logger.info('[Notification] Cleaned up old notifications', { deleted: result.deletedCount });
}

module.exports = {
  createNotification,
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
  deleteNotification,
  sendEmailNotification,
  sendBrowserNotification,
  generateWhatsAppLink,
  deleteOldNotifications,
};
