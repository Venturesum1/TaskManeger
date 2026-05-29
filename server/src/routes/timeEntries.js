const express = require('express');
const router = express.Router({ mergeParams: true });
const TimeEntry = require('../models/TimeEntry');
const { requireAuth } = require('../middleware/authMiddleware');
const { success, created, serverError } = require('../helpers');

router.use(requireAuth);

// GET /api/tasks/:taskId/time
router.get('/', async (req, res) => {
  try {
    const entries = await TimeEntry.find({ task: req.params.taskId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const totalSeconds = entries
      .filter(e => !e.isRunning)
      .reduce((sum, e) => sum + (e.duration || 0), 0);

    const running = entries.find(e => e.isRunning && e.user._id.toString() === req.auth.userId);

    return success(res, { entries, totalSeconds, running: running || null });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/tasks/:taskId/time/start
router.post('/start', async (req, res) => {
  try {
    // Stop any running entry for this user on this task first
    await TimeEntry.updateMany(
      { task: req.params.taskId, user: req.auth.userId, isRunning: true },
      { $set: { isRunning: false, stoppedAt: new Date() } }
    );

    const entry = await TimeEntry.create({
      task: req.params.taskId,
      user: req.auth.userId,
      startedAt: new Date(),
      isRunning: true,
      duration: 0,
    });
    return created(res, entry);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/tasks/:taskId/time/stop
router.post('/stop', async (req, res) => {
  try {
    const running = await TimeEntry.findOne({
      task: req.params.taskId,
      user: req.auth.userId,
      isRunning: true,
    });

    if (!running) return success(res, { duration: 0 });

    const now = new Date();
    const duration = Math.floor((now - running.startedAt) / 1000);
    running.stoppedAt = now;
    running.isRunning = false;
    running.duration = duration;
    await running.save();

    return success(res, running);
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
