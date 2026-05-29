const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const activityService = require('../services/activityService');
const { success, serverError } = require('../helpers');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await activityService.listActivities(req.query);
    return success(res, result);
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
