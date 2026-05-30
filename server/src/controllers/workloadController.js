const User = require('../models/User');
const Task = require('../models/Task');
const TimeEntry = require('../models/TimeEntry');
const { connectDB } = require('../database/mongodb');
const { success, forbidden, serverError } = require('../helpers');

async function getWorkload(req, res) {
  try {
    if (!['admin', 'manager'].includes(req.auth.role)) {
      return forbidden(res);
    }

    await connectDB();
    const now = new Date();

    const users = await User.find({ role: { $in: ['admin', 'manager', 'member'] }, isActive: true })
      .select('name email role department avatar')
      .lean();

    const workload = await Promise.all(users.map(async (user) => {
      const [tasks, timeEntries] = await Promise.all([
        Task.find({ owner: user._id }).select('status priority endDate estimatedHours').lean(),
        TimeEntry.find({ user: user._id }).select('duration').lean(),
      ]);

      const totalTasks = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const inProgress = tasks.filter(t => t.status === 'in_progress').length;
      const overdue = tasks.filter(t =>
        t.endDate && new Date(t.endDate) < now && t.status !== 'completed'
      ).length;
      const assigned = tasks.filter(t => t.status !== 'completed').length;

      const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      const actualSeconds = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const actualHours = Math.round((actualSeconds / 3600) * 10) / 10;
      const utilization = estimatedHours > 0
        ? Math.min(Math.round((actualHours / estimatedHours) * 100), 200)
        : 0;

      // Color indicator: green 0-5 open, yellow 6-10, red 11+
      let load = 'green';
      if (assigned > 10) load = 'red';
      else if (assigned > 5) load = 'yellow';

      const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

      return {
        user,
        totalTasks,
        assigned,
        completed,
        inProgress,
        overdue,
        estimatedHours,
        actualHours,
        utilization,
        completionRate,
        load,
      };
    }));

    return success(res, workload);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { getWorkload };
