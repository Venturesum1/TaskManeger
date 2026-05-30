const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', milestoneController.list);
router.post('/', milestoneController.create);
router.get('/:id', milestoneController.getOne);
router.patch('/:id', milestoneController.update);
router.delete('/:id', milestoneController.remove);

module.exports = router;
