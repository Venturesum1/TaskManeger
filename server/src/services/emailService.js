const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');
const { sleep } = require('../helpers');

const TEMPLATE_DIR = path.join(__dirname, '../templates/email');

let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
    });
  }
  return _transporter;
}

async function verifyTransporter() {
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    throw new Error('Email credentials not configured (EMAIL_USER / EMAIL_PASS missing)');
  }
  const transporter = getTransporter();
  await transporter.verify();
}

function loadTemplate(templateName) {
  const filePath = path.join(TEMPLATE_DIR, `${templateName}.html`);
  if (!fs.existsSync(filePath)) throw new Error(`Email template not found: ${templateName}`);
  return fs.readFileSync(filePath, 'utf-8');
}

function renderTemplate(html, vars) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

async function sendEmail({ to, subject, html, retries = emailConfig.maxRetries }) {
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    logger.warn('[Email] Skipped — credentials not configured', { to, subject });
    return;
  }

  const transporter = getTransporter();
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
      });
      logger.info('[Email] Sent successfully', {
        to,
        subject,
        messageId: info.messageId,
        attempt,
        timestamp: new Date().toISOString(),
      });
      return info;
    } catch (err) {
      lastError = err;
      logger.error('[Email] Send failed', {
        to,
        subject,
        attempt,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      if (attempt < retries) {
        await sleep(emailConfig.retryDelayMs * attempt);
      }
    }
  }

  logger.error('[Email] All retries exhausted', { to, subject, error: lastError?.message });
  throw lastError;
}

async function sendToMany(emails, subject, html) {
  const unique = [...new Set(emails.filter(Boolean))];
  const results = await Promise.allSettled(
    unique.map((to) => sendEmail({ to, subject, html }))
  );
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    logger.warn('[Email] Some recipients failed', { count: failed.length });
  }
}

async function sendTaskReminder({ to, taskTitle, ownerName, dueDate, priority, statusLabel, milestone, isOverdue }) {
  const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' }[priority] || priority;
  const subject = isOverdue
    ? `Overdue Task: ${taskTitle}`
    : `Task Due Reminder: ${taskTitle}`;

  const html = renderTemplate(loadTemplate('taskReminder'), {
    subject,
    taskTitle,
    ownerName,
    dueDate: dueDate || 'N/A',
    priority,
    priorityLabel,
    statusLabel: statusLabel || 'In Progress',
    milestone: milestone || '',
    isOverdue: isOverdue ? 'true' : '',
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  });

  await sendEmail({ to, subject, html });
}

async function sendMeetingInvite({ participants, title, date, startTime, endTime, meetLink, subject }) {
  const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = renderTemplate(loadTemplate('meetingInvite'), {
    subject: subject || `Meeting Invite: ${title}`,
    meetingTitle: title,
    dateFormatted,
    startTime,
    endTime,
    meetLink: meetLink || '',
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  });

  const emailList = participants
    .map((p) => (typeof p === 'object' ? p.email : null))
    .filter(Boolean);

  if (process.env.ADMIN_EMAIL) emailList.push(process.env.ADMIN_EMAIL);

  await sendToMany(emailList, subject || `Meeting Invite: ${title}`, html);
}

async function sendDeadlineReminder({ to, overdueTasks, dueSoonTasks }) {
  const subject = 'Daily Deadline Summary — B4Utaskmanagement';

  const overdueRows = (overdueTasks || []).map((t) => `
    <div class="task-card">
      <p class="task-name">${t.title}<span class="tag tag-overdue">Overdue</span></p>
      <p class="task-meta">Owner: ${t.ownerName} · Was due: ${t.dueDate}</p>
    </div>`).join('');

  const dueSoonRows = (dueSoonTasks || []).map((t) => `
    <div class="task-card">
      <p class="task-name">${t.title}<span class="tag tag-due-soon">Due Tomorrow</span></p>
      <p class="task-meta">Owner: ${t.ownerName} · Due: ${t.dueDate}</p>
    </div>`).join('');

  let html = loadTemplate('deadlineReminder');
  html = html
    .replace('{{#each overdueTasks}}{{this.title}}<span class="tag tag-overdue">Overdue</span>{{/each}}', overdueRows)
    .replace('{{#each dueSoonTasks}}{{this.title}}<span class="tag tag-due-soon">Due Tomorrow</span>{{/each}}', dueSoonRows);

  html = renderTemplate(html, {
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  });

  html = html
    .replace(/\{\{#each overdueTasks\}\}[\s\S]*?\{\{\/each\}\}/g, overdueRows)
    .replace(/\{\{#each dueSoonTasks\}\}[\s\S]*?\{\{\/each\}\}/g, dueSoonRows);

  await sendEmail({ to, subject, html });
}

async function sendMeetingReminder({ to, title, date, startTime, endTime, meetLink }) {
  const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const subject = `Meeting in 1 hour: ${title}`;

  const html = renderTemplate(loadTemplate('meetingInvite'), {
    subject,
    meetingTitle: title,
    dateFormatted,
    startTime,
    endTime,
    meetLink: meetLink || '',
    appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  });

  await sendEmail({ to, subject, html });
}

async function sendWelcomeEmail({ to, name }) {
  const subject = `Welcome to B4Utaskmanagement, ${name}!`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;background:#F9FAFB;padding:32px 16px">
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:36px;max-width:560px;margin:0 auto">
        <p style="font-size:11px;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px">Welcome · B4Utaskmanagement</p>
        <h1 style="font-size:22px;font-weight:700;color:#111827;margin-bottom:12px">Hi ${name}, welcome aboard! 👋</h1>
        <p style="font-size:14px;color:#6B7280;margin-bottom:24px">Your account has been created. You can now log in and start managing tasks and meetings.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display:inline-block;background:#6366F1;color:#fff;padding:11px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Log In Now</a>
        <div style="margin-top:28px;font-size:12px;color:#9CA3AF;border-top:1px solid #F3F4F6;padding-top:20px">
          <p>B4Utaskmanagement — Task &amp; Meeting Management</p>
        </div>
      </div>
    </div>`;
  await sendEmail({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendToMany,
  sendTaskReminder,
  sendMeetingInvite,
  sendDeadlineReminder,
  sendMeetingReminder,
  sendWelcomeEmail,
  verifyTransporter,
};
