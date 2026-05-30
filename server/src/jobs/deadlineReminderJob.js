const cron = require('node-cron');
const taskService = require('../services/taskService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const { CRON_SCHEDULE } = require('../constants');
const logger = require('../utils/logger');

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

async function runDeadlineCheck() {
  logger.info('[DeadlineJob] Running deadline check...');
  try {
    const [overdueTasks, dueSoonTasks] = await Promise.all([
      taskService.getOverdueTasks(),
      taskService.getTasksDueTomorrow(),
    ]);

    logger.info('[DeadlineJob] Found tasks', {
      overdue: overdueTasks.length,
      dueSoon: dueSoonTasks.length,
    });

    for (const task of overdueTasks) {
      const owner = task.owner;
      if (!owner || typeof owner !== 'object') continue;
      notificationService.createNotification({
        userId: owner._id,
        type: 'task_overdue',
        title: 'Task Overdue',
        message: `"${task.title}" is overdue. Please update its status.`,
        metadata: { taskId: task._id },
      }).catch(() => {});
    }

    for (const task of dueSoonTasks) {
      const owner = task.owner;
      if (!owner || typeof owner !== 'object') continue;
      notificationService.createNotification({
        userId: owner._id,
        type: 'task_due',
        title: 'Task Due Tomorrow',
        message: `"${task.title}" is due tomorrow. Please complete it on time.`,
        metadata: { taskId: task._id },
      }).catch(() => {});
    }

    logger.info('[DeadlineJob] Completed');
  } catch (err) {
    logger.error('[DeadlineJob] Error', { error: err.message });
  }
}

function start() {
  cron.schedule(CRON_SCHEDULE.EVERY_MORNING, runDeadlineCheck, {
    timezone: 'Asia/Kolkata',
  });
  logger.info('[DeadlineJob] Scheduled — runs every morning at 9:00 AM IST');
}

module.exports = { start, runDeadlineCheck };
