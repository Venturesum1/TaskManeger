const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { connectDB } = require('../lib/db');
const { getAuthUser } = require('../lib/auth');

// GET /api/tasks
router.get('/', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const { status, priority, owner, search } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (owner && owner !== 'all') query.owner = owner;
    if (search) query.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .populate('owner', 'name email department phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const { title, description, owner, priority, status, startDate, endDate, milestone } = req.body;
    if (!title?.trim() || !owner)
      return res.status(400).json({ success: false, error: 'Title and owner are required' });

    const task = await Task.create({
      title: title.trim(), description, owner,
      priority: priority || 'medium',
      status: status || 'not_started',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      milestone, createdBy: auth.userId,
    });
    const populated = await task.populate('owner', 'name email department phone');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    const task = await Task.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
      .populate('owner', 'name email department phone').lean();
    if (!task) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    await connectDB();
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
