const Activity = require('../models/Activity');

async function log({ userId, action, entityType, entityId, entityTitle, details }) {
  try {
    await Activity.create({
      user: userId,
      action,
      entityType,
      entityId: entityId || undefined,
      entityTitle: entityTitle || '',
      details: details || '',
    });
  } catch (err) {
    // Activity logging must never crash the main request
    console.error('[Activity] Failed to log activity:', err.message);
  }
}

async function listActivities({ page = 1, limit = 50, userId, action, entityType, search, startDate, endDate }) {
  const query = {};
  if (userId) query.user = userId;
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (search) {
    query.$or = [
      { action: { $regex: search, $options: 'i' } },
      { entityTitle: { $regex: search, $options: 'i' } },
      { details: { $regex: search, $options: 'i' } },
    ];
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [activities, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name email role'),
    Activity.countDocuments(query),
  ]);

  return { activities, total, page: Number(page), limit: Number(limit) };
}

module.exports = { log, listActivities };
