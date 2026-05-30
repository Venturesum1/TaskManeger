const express = require('express');
const router = express.Router();
const workloadController = require('../controllers/workloadController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', workloadController.getWorkload);

module.exports = router;
