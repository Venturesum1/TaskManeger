const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.get('/',       requirePermission('projects.view'),   projectController.list);
router.post('/',      requirePermission('projects.create'), projectController.create);
router.get('/:id',    requirePermission('projects.view'),   projectController.getOne);
router.patch('/:id',  requirePermission('projects.edit'),   projectController.update);
router.delete('/:id', requirePermission('projects.delete'), projectController.remove);

module.exports = router;
