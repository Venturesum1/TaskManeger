const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { success, fail, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const notifications = await notificationService.getNotifications(req.auth.userId);
    return success(res, notifications);
  } catch (err) {
    return serverError(res, err);
  }
}

async function markRead(req, res) {
  try {
    const notification = await notificationService.markRead(req.params.id, req.auth.userId);
    return success(res, notification);
  } catch (err) {
    return serverError(res, err);
  }
}

async function markAllRead(req, res) {
  try {
    await notificationService.markAllRead(req.auth.userId);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

async function unreadCount(req, res) {
  try {
    const count = await notificationService.getUnreadCount(req.auth.userId);
    return success(res, { count });
  } catch (err) {
    return serverError(res, err);
  }
}

async function sendReminder(req, res) {
  try {
    const { type, to, subject, data } = req.body;
    if (!to || !subject) return fail(res, 'Recipient and subject are required');

    if (type === 'task_due' || type === 'task_overdue') {
      await emailService.sendTaskReminder({
        to,
        taskTitle: data?.taskTitle || '',
        ownerName: data?.ownerName || '',
        dueDate: data?.dueDate || 'N/A',
        priority: data?.priority || 'medium',
        statusLabel: data?.statusLabel || '',
        milestone: data?.milestone || '',
        isOverdue: type === 'task_overdue',
      });
    } else if (type === 'meeting_reminder') {
      await emailService.sendMeetingReminder({
        to,
        title: data?.title || '',
        date: data?.date || new Date(),
        startTime: data?.startTime || '',
        endTime: data?.endTime || '',
        meetLink: data?.meetLink || '',
      });
    } else {
      await emailService.sendEmail({ to, subject, html: `<p>${data?.message || subject}</p>` });
    }

    return success(res, { message: 'Reminder sent' });
  } catch (err) {
    return serverError(res, err);
  }
}

function getWhatsAppLink(req, res) {
  try {
    const { phone, message } = req.query;
    if (!phone || !message) return fail(res, 'phone and message query params required');
    const link = notificationService.generateWhatsAppLink(phone, message);
    return success(res, { link });
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, markRead, markAllRead, unreadCount, sendReminder, getWhatsAppLink };
