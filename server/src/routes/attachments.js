const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID: uuidv4 } = require('crypto');
const Attachment = require('../models/Attachment');
const activityService = require('../services/activityService');
const { requireAuth } = require('../middleware/authMiddleware');
const { success, created, notFound, serverError } = require('../helpers');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

router.use(requireAuth);

// GET /api/tasks/:taskId/attachments
router.get('/', async (req, res) => {
  try {
    const attachments = await Attachment.find({ task: req.params.taskId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return success(res, attachments);
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/tasks/:taskId/attachments
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return serverError(res, new Error('No file uploaded'));
    const attachment = await Attachment.create({
      task: req.params.taskId,
      uploadedBy: req.auth.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });
    await attachment.populate('uploadedBy', 'name email');
    activityService.log({
      userId: req.auth.userId,
      action: 'uploaded file',
      entityType: 'attachment',
      entityId: req.params.taskId,
      details: req.file.originalname,
    });
    return created(res, attachment);
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/tasks/:taskId/attachments/:id/download
router.get('/:id/download', async (req, res) => {
  try {
    const attachment = await Attachment.findOne({ _id: req.params.id, task: req.params.taskId });
    if (!attachment) return notFound(res, 'Attachment');
    res.download(attachment.path, attachment.originalName);
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/tasks/:taskId/attachments/:id
router.delete('/:id', async (req, res) => {
  try {
    const attachment = await Attachment.findOneAndDelete({ _id: req.params.id, task: req.params.taskId });
    if (!attachment) return notFound(res, 'Attachment');
    try { fs.unlinkSync(attachment.path); } catch {}
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
