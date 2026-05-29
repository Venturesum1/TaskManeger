const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', requireAuth, settingsController.get);
router.patch('/', requireAdmin, settingsController.update);

module.exports = router;
