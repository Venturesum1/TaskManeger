const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', requireAuth, notificationController.sendReminder);

module.exports = router;
