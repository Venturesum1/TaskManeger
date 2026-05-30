const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.get('/',       requirePermission('milestones.view'),   milestoneController.list);
router.post('/',      requirePermission('milestones.create'), milestoneController.create);
router.get('/:id',    requirePermission('milestones.view'),   milestoneController.getOne);
router.patch('/:id',  requirePermission('milestones.edit'),   milestoneController.update);
router.delete('/:id', requirePermission('milestones.delete'), milestoneController.remove);

module.exports = router;
