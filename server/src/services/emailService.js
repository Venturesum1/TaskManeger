/**
 * Central Email Service — single source of truth for all email sending.
 * No controller, route, cron job, or service should send emails directly.
 * All email goes through this module.
 */

const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const { getProvider } = require('./email/providers/gmailProvider');
const logger = require('../utils/logger');

const TEMPLATE_DIR = path.join(__dirname, '../templates/email');
const _templateCache = {};

// ─── Template Engine ───────────────────────────────────────────────────────

function compileTemplate(name) {
  if (!_templateCache[name]) {
    const filePath = path.join(TEMPLATE_DIR, `${name}.html`);
    if (!fs.existsSync(filePath)) throw new Error(`Email template not found: ${name}`);
    _templateCache[name] = Handlebars.compile(fs.readFileSync(filePath, 'utf-8'));
  }
  return _templateCache[name];
}

function render(templateName, vars = {}) {
  const compiled = compileTemplate(templateName);
  return compiled({
    companyName: process.env.EMAIL_FROM_NAME || 'B4Utaskmanagement',
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    year: new Date().getFullYear(),
    ...vars,
  });
}

// ─── Queue + Log (lazy-loaded to avoid circular deps at startup) ───────────

function getEmailQueue() { return require('../models/EmailQueue'); }
function getEmailLog()   { return require('../models/EmailLog');   }
function getDB()         { return require('../database/mongodb');  }

async function queueEmail({ template, recipient, subject, html }) {
  try {
    await getDB().connectDB();
    const EmailQueue = getEmailQueue();
    const doc = await EmailQueue.create({ recipient, subject, template, html });
    logger.info('[EmailService] Queued', { template, recipient, queueId: doc._id });
    return doc;
  } catch (err) {
    logger.error('[EmailService] Queue insert failed', { recipient, template, error: err.message });
    throw err;
  }
}

async function logEmail({ recipient, subject, template, status, messageId = '', errorMessage = '', queueId }) {
  try {
    await getDB().connectDB();
    await getEmailLog().create({
      recipient, subject, template,
      provider: 'gmail',
      status, messageId, errorMessage, queueId,
    });
  } catch (err) {
    logger.error('[EmailService] Log write failed', { error: err.message });
  }
}

// ─── Core Send (used by queue processor only) ──────────────────────────────

async function sendImmediate({ to, subject, html, template = 'custom', queueId }) {
  const provider = getProvider();
  try {
    const info = await provider.send({ to, subject, html });
    await logEmail({ recipient: to, subject, template, status: 'sent', messageId: info.messageId, queueId });
    return info;
  } catch (err) {
    await logEmail({ recipient: to, subject, template, status: 'failed', errorMessage: err.message, queueId });
    throw err;
  }
}

// ─── Public API: all functions queue to DB, processor sends them ───────────

async function sendTaskAssigned({ to, taskTitle, assignedBy, ownerName, dueDate, priority }) {
  const subject = `Task Assigned: ${taskTitle}`;
  const html = render('taskAssigned', { subject, taskTitle, assignedBy, ownerName, dueDate, priority, priorityLabel: cap(priority) });
  return queueEmail({ template: 'taskAssigned', recipient: to, subject, html });
}

async function sendTaskReminder({ to, taskTitle, ownerName, dueDate, priority, statusLabel, milestone, isOverdue }) {
  const subject = isOverdue ? `Overdue Task: ${taskTitle}` : `Task Reminder: ${taskTitle}`;
  const html = render('taskReminder', {
    subject, taskTitle, ownerName,
    dueDate: dueDate || 'N/A',
    priority, priorityLabel: cap(priority),
    statusLabel: statusLabel || 'In Progress',
    milestone: milestone || '',
    isOverdue: !!isOverdue,
  });
  return queueEmail({ template: 'taskReminder', recipient: to, subject, html });
}

async function sendTaskCompleted({ to, taskTitle, completedBy }) {
  const subject = `Task Completed: ${taskTitle}`;
  const html = render('taskCompleted', { subject, taskTitle, completedBy });
  return queueEmail({ template: 'taskCompleted', recipient: to, subject, html });
}

async function sendMeetingInvite({ participants, title, date, startTime, endTime, meetLink, subject: subjectOverride }) {
  const subject = subjectOverride || `Meeting Invite: ${title}`;
  const dateFormatted = fmtDate(date);
  const html = render('meetingInvite', { subject, meetingTitle: title, dateFormatted, startTime, endTime, meetLink: meetLink || '' });

  const emails = buildRecipientList(participants);
  await Promise.all(emails.map(to => queueEmail({ template: 'meetingInvite', recipient: to, subject, html })));
}

async function sendMeetingReminder({ to, title, date, startTime, endTime, meetLink }) {
  const subject = `Meeting in 1 hour: ${title}`;
  const html = render('meetingReminder', { subject, meetingTitle: title, dateFormatted: fmtDate(date), startTime, endTime, meetLink: meetLink || '' });
  return queueEmail({ template: 'meetingReminder', recipient: to, subject, html });
}

async function sendOverdueTask({ to, taskTitle, ownerName, dueDate, priority }) {
  const subject = `Overdue Task: ${taskTitle}`;
  const html = render('overdueTask', { subject, taskTitle, ownerName, dueDate: dueDate || 'N/A', priority, priorityLabel: cap(priority) });
  return queueEmail({ template: 'overdueTask', recipient: to, subject, html });
}

async function sendDeadlineReminder({ to, overdueTasks, dueSoonTasks }) {
  const subject = 'Daily Deadline Summary — B4Utaskmanagement';
  const html = render('deadlineReminder', {
    subject,
    overdueTasks: (overdueTasks || []).map(t => ({ title: t.title, ownerName: t.ownerName, dueDate: t.dueDate })),
    dueSoonTasks: (dueSoonTasks || []).map(t => ({ title: t.title, ownerName: t.ownerName, dueDate: t.dueDate })),
  });
  return queueEmail({ template: 'deadlineReminder', recipient: to, subject, html });
}

async function sendWelcomeEmail({ to, name, password = '', role = 'member' }) {
  const subject = `Welcome to B4Utaskmanagement, ${name}!`;
  const html = render('welcome', { subject, name, email: to, password, role });
  return queueEmail({ template: 'welcome', recipient: to, subject, html });
}

async function sendPasswordReset({ to, name, resetUrl }) {
  const subject = 'Reset Your Password — B4Utaskmanagement';
  const html = render('passwordReset', { subject, name, resetUrl });
  return queueEmail({ template: 'passwordReset', recipient: to, subject, html });
}

async function sendTestEmail({ to }) {
  const subject = 'Test Email — B4Utaskmanagement SMTP Verified';
  const html = render('welcome', { subject, name: 'Test Recipient' });
  return sendImmediate({ to, subject, html, template: 'test' });
}

async function sendEmail({ to, subject, html }) {
  return queueEmail({ template: 'custom', recipient: to, subject, html });
}

// ─── Startup Verification ──────────────────────────────────────────────────

async function verifyConnection() {
  const provider = getProvider();
  await provider.verify();
}

// ─── Admin Stats ───────────────────────────────────────────────────────────

async function getDailyStats() {
  await getDB().connectDB();
  const EmailLog = getEmailLog();
  const EmailQueue = getEmailQueue();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [sentToday, failedToday, pendingQueue] = await Promise.all([
    EmailLog.countDocuments({ status: 'sent', timestamp: { $gte: start } }),
    EmailLog.countDocuments({ status: 'failed', timestamp: { $gte: start } }),
    EmailQueue.countDocuments({ status: { $in: ['pending', 'failed'] } }),
  ]);

  const total = sentToday + failedToday;
  return {
    sentToday,
    failedToday,
    pendingQueue,
    successRate: total > 0 ? `${Math.round((sentToday / total) * 100)}%` : 'N/A',
  };
}

async function getFailedEmails(limit = 20) {
  await getDB().connectDB();
  return getEmailQueue()
    .find({ status: 'failed' })
    .sort({ lastAttempt: -1 })
    .limit(limit)
    .lean();
}

async function requeueEmail(queueId) {
  await getDB().connectDB();
  const EmailQueue = getEmailQueue();
  const doc = await EmailQueue.findById(queueId);
  if (!doc) throw new Error('Queue item not found');
  await doc.updateOne({ status: 'pending', attempts: 0, nextRetry: new Date(), lastError: '' });
  logger.info('[EmailService] Requeued', { queueId });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

function fmtDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function buildRecipientList(participants) {
  const emails = participants
    .map(p => (typeof p === 'object' ? p.email : null))
    .filter(Boolean);
  if (process.env.ADMIN_EMAIL && !emails.includes(process.env.ADMIN_EMAIL)) {
    emails.push(process.env.ADMIN_EMAIL);
  }
  return [...new Set(emails)];
}

module.exports = {
  sendImmediate,
  sendTaskAssigned,
  sendTaskReminder,
  sendTaskCompleted,
  sendMeetingInvite,
  sendMeetingReminder,
  sendOverdueTask,
  sendDeadlineReminder,
  sendWelcomeEmail,
  sendPasswordReset,
  sendTestEmail,
  sendEmail,
  verifyConnection,
  getDailyStats,
  getFailedEmails,
  requeueEmail,
};
