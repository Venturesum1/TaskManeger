const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/login',           authController.login);
router.post('/logout',          authController.logout);
router.get('/me',   requireAuth, authController.me);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
