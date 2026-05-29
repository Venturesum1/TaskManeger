const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');
const { success, serverError } = require('../helpers');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const endOfWeek = new Date(now.getTime() + 7 * 86400000);

    const [
      allTasks,
      completedThisMonth,
      upcomingMeetings,
      tasksByUser,
    ] = await Promise.all([
      Task.find().lean(),
      Task.countDocuments({ status: 'completed', updatedAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Meeting.countDocuments({ date: { $gte: now }, status: { $ne: 'cancelled' } }),
      Task.aggregate([
        {
          $group: {
            _id: '$owner',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$user.name', 'Unassigned'] },
            total: 1,
            completed: 1,
            inProgress: 1,
            blocked: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    // Tasks by status
    const statusCounts = {
      not_started: 0,
      in_progress: 0,
      blocked: 0,
      completed: 0,
      delayed: 0,
    };
    allTasks.forEach(t => { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++; });

    const pending = statusCounts.not_started + statusCounts.in_progress;
    const overdue = allTasks.filter(t =>
      t.endDate && new Date(t.endDate) < now && t.status !== 'completed'
    ).length;

    return success(res, {
      kpis: {
        totalTasks: allTasks.length,
        pending,
        completed: statusCounts.completed,
        completedThisMonth,
        overdue,
        upcomingMeetings,
      },
      tasksByStatus: [
        { name: 'Not Started', value: statusCounts.not_started, color: '#94A3B8' },
        { name: 'In Progress', value: statusCounts.in_progress, color: '#6366F1' },
        { name: 'Blocked', value: statusCounts.blocked, color: '#EF4444' },
        { name: 'Completed', value: statusCounts.completed, color: '#10B981' },
        { name: 'Delayed', value: statusCounts.delayed, color: '#F59E0B' },
      ],
      tasksByUser,
    });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
