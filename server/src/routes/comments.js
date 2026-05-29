const express = require('express');
const router = express.Router({ mergeParams: true });
const Comment = require('../models/Comment');
const activityService = require('../services/activityService');
const { requireAuth } = require('../middleware/authMiddleware');
const { success, created, fail, notFound, serverError } = require('../helpers');

router.use(requireAuth);

// GET /api/tasks/:taskId/comments
router.get('/', async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email role')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    return success(res, comments);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/tasks/:taskId/comments
router.post('/', async (req, res) => {
  try {
    const { content, mentions } = req.body;
    if (!content?.trim()) return fail(res, 'Comment content is required');

    const comment = await Comment.create({
      task: req.params.taskId,
      author: req.auth.userId,
      content: content.trim(),
      mentions: mentions || [],
    });
    await comment.populate('author', 'name email role');

    activityService.log({
      userId: req.auth.userId,
      action: 'added comment',
      entityType: 'task',
      entityId: req.params.taskId,
      details: content.slice(0, 80),
    });

    return created(res, comment);
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/tasks/:taskId/comments/:id
router.patch('/:id', async (req, res) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, author: req.auth.userId },
      { content: req.body.content },
      { new: true }
    ).populate('author', 'name email role');
    if (!comment) return notFound(res, 'Comment');
    return success(res, comment);
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/tasks/:taskId/comments/:id
router.delete('/:id', async (req, res) => {
  try {
    await Comment.findOneAndDelete({ _id: req.params.id, author: req.auth.userId });
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
