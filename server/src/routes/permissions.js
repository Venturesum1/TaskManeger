const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/permissionController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Current user's effective permissions
router.get('/my', ctrl.myPermissions);

// All permission definitions
router.get('/definitions', ctrl.definitions);

// Roles
router.get('/roles', ctrl.listRoles);
router.post('/roles', ctrl.createRole);
router.delete('/roles/:roleName', ctrl.deleteRole);

// Role permissions
router.get('/roles/:roleName/permissions', ctrl.getRolePermissions);
router.patch('/roles/:roleName/permissions', ctrl.updateRolePermissions);
router.patch('/roles/:roleName/permissions/:permKey', ctrl.toggleRolePermission);

// User overrides
router.get('/users/:userId/overrides', ctrl.getUserOverrides);
router.post('/users/:userId/overrides', ctrl.setUserOverride);
router.delete('/users/:userId/overrides/:permKey', ctrl.clearUserOverride);
router.delete('/users/:userId/overrides', ctrl.clearAllUserOverrides);

// Audit log
router.get('/audit', ctrl.getAuditLogs);

module.exports = router;
