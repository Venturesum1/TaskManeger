const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teamController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/',       requireAuth,                                           ctrl.list);
router.post('/',      requireAuth, requirePermission('team.add_member'),    ctrl.create);
router.patch('/:id',  requireAuth, requirePermission('team.edit_member'),   ctrl.update);
router.delete('/:id', requireAuth, requirePermission('team.delete_member'), ctrl.remove);

// Admin-only security actions
router.post('/:id/reset-password',       requireAuth, ctrl.resetPassword);
router.post('/:id/force-password-change',requireAuth, ctrl.forcePasswordChange);
router.post('/:id/lock',                 requireAuth, ctrl.lockUser);
router.post('/:id/unlock',               requireAuth, ctrl.unlockUser);
router.patch('/:id/active',              requireAuth, ctrl.setActive);
router.get('/:id/login-history',         requireAuth, ctrl.loginHistory);

module.exports = router;
