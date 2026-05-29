const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', requireAuth, teamController.list);
router.post('/', requireAdmin, teamController.create);
router.patch('/:id', requireAuth, teamController.update);
router.delete('/:id', requireAdmin, teamController.remove);

module.exports = router;
