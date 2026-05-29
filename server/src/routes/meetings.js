const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', meetingController.list);
router.post('/', meetingController.create);
router.patch('/:id', meetingController.update);
router.delete('/:id', meetingController.remove);

module.exports = router;
