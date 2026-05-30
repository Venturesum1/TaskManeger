const cron = require('node-cron');
const logger = require('../utils/logger');
const { connectDB } = require('../database/mongodb');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

// Run automation checks every hour at minute 5
function start() {
  cron.schedule('5 * * * *', async () => {
    logger.info('[Automation] Running automation checks...');
    try {
      await connectDB();
      await Promise.all([
        checkTasksDueTomorrow(),
        checkOverdueTasks(),
        checkDelayedMilestones(),
        checkDelayedProjects(),
      ]);
      logger.info('[Automation] ✓ All checks complete');
    } catch (err) {
      logger.error('[Automation] Check failed', { error: err.message });
    }
  });
  logger.info('[Automation] ✓ Automation job scheduled (hourly at :05)');
}

async function checkTasksDueTomorrow() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    endDate: { $gte: start, $lte: end },
    status: { $nin: ['completed'] },
  }).populate('owner', 'name email').lean();

  for (const task of tasks) {
    const owner = task.owner;
    if (!owner) continue;
    notificationService.createNotification({
      userId: owner._id,
      type: 'deadline_reminder',
      title: 'Task Due Tomorrow',
      message: `Your task "${task.title}" is due tomorrow.`,
      metadata: { taskId: task._id },
    }).catch(() => {});

    if (owner.email) {
      emailService.sendEmail({
        to: owner.email,
        subject: `Reminder: Task "${task.title}" due tomorrow`,
        html: `<p>Hi ${owner.name},</p><p>Your task <strong>${task.title}</strong> is due tomorrow. Please ensure it is completed on time.</p>`,
      }).catch(() => {});
    }
  }
  if (tasks.length) logger.info(`[Automation] Due-tomorrow reminders sent for ${tasks.length} task(s)`);
}

async function checkOverdueTasks() {
  const now = new Date();
  const tasks = await Task.find({
    endDate: { $lt: now },
    status: { $nin: ['completed'] },
  }).populate('owner', 'name email').lean();

  for (const task of tasks) {
    const owner = task.owner;
    if (!owner) continue;
    notificationService.createNotification({
      userId: owner._id,
      type: 'task_overdue',
      title: 'Task Overdue',
      message: `Your task "${task.title}" is overdue and needs immediate attention.`,
      metadata: { taskId: task._id },
    }).catch(() => {});
  }
  if (tasks.length) logger.info(`[Automation] Overdue notifications created for ${tasks.length} task(s)`);
}

async function checkDelayedMilestones() {
  const now = new Date();
  const milestones = await Milestone.find({
    endDate: { $lt: now },
    status: { $nin: ['completed'] },
  }).populate('projectId', 'name').lean();

  if (!milestones.length) return;

  const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true }).select('_id').lean();

  for (const milestone of milestones) {
    for (const mgr of managers) {
      notificationService.createNotification({
        userId: mgr._id,
        type: 'project_updated',
        title: 'Milestone Delayed',
        message: `Milestone "${milestone.name}" in project "${milestone.projectId?.name || 'Unknown'}" is delayed.`,
        metadata: {},
      }).catch(() => {});
    }

    // Update status if not already delayed
    if (milestone.status !== 'delayed') {
      await Milestone.findByIdAndUpdate(milestone._id, { status: 'delayed' }).catch(() => {});
    }
  }
  logger.info(`[Automation] Delayed milestone alerts sent for ${milestones.length} milestone(s)`);
}

async function checkDelayedProjects() {
  const now = new Date();
  const projects = await Project.find({
    endDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] },
  }).lean();

  if (!projects.length) return;

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();

  for (const project of projects) {
    for (const admin of admins) {
      notificationService.createNotification({
        userId: admin._id,
        type: 'project_updated',
        title: 'Project Delayed',
        message: `Project "${project.name}" has passed its end date and may be delayed.`,
        metadata: {},
      }).catch(() => {});
    }
  }
  logger.info(`[Automation] Delayed project alerts sent for ${projects.length} project(s)`);
}

module.exports = { start };
