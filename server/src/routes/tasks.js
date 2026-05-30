const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.get('/',    requirePermission('tasks.view'),   taskController.list);
router.post('/',   requirePermission('tasks.create'), taskController.create);
router.patch('/:id',  requirePermission('tasks.edit'),   taskController.update);
router.delete('/:id', requirePermission('tasks.delete'), taskController.remove);

module.exports = router;
