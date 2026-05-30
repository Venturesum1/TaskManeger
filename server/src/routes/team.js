const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/',       requireAuth,                                           teamController.list);
router.post('/',      requireAuth, requirePermission('team.add_member'),    teamController.create);
router.patch('/:id',  requireAuth, requirePermission('team.edit_member'),   teamController.update);
router.delete('/:id', requireAuth, requirePermission('team.delete_member'), teamController.remove);

module.exports = router;
