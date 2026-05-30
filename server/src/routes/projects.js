const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', projectController.list);
router.post('/', projectController.create);
router.get('/:id', projectController.getOne);
router.patch('/:id', projectController.update);
router.delete('/:id', projectController.remove);

module.exports = router;
