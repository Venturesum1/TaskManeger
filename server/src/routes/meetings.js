const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.get('/',       requirePermission('meetings.view'),     meetingController.list);
router.post('/',      requirePermission('meetings.schedule'), meetingController.create);
router.patch('/:id',  requirePermission('meetings.edit'),     meetingController.update);
router.delete('/:id', requirePermission('meetings.delete'),   meetingController.remove);

module.exports = router;
