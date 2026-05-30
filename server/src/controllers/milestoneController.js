const milestoneService = require('../services/milestoneService');
const activityService = require('../services/activityService');
const notificationService = require('../services/notificationService');
const User = require('../models/User');
const { success, created, fail, notFound, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const milestones = await milestoneService.listMilestones(req.query);
    return success(res, milestones);
  } catch (err) {
    return serverError(res, err);
  }
}

async function getOne(req, res) {
  try {
    const milestone = await milestoneService.getMilestoneById(req.params.id);
    return success(res, milestone);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Milestone');
    return serverError(res, err);
  }
}

async function create(req, res) {
  try {
    const milestone = await milestoneService.createMilestone(req.body);
    activityService.log({
      userId: req.auth.userId,
      action: 'created milestone',
      entityType: 'milestone',
      entityId: milestone._id,
      entityTitle: milestone.name,
    });
    return created(res, milestone);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const prev = await milestoneService.getMilestoneById(req.params.id).catch(() => null);
    const milestone = await milestoneService.updateMilestone(req.params.id, req.body);

    // Notify on completion
    if (req.body.status === 'completed' && prev?.status !== 'completed') {
      const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true }).select('_id').lean();
      managers.forEach(m => {
        notificationService.createNotification({
          userId: m._id,
          type: 'milestone_completed',
          title: 'Milestone Completed',
          message: `Milestone "${milestone.name}" has been marked complete.`,
          metadata: {},
        }).catch(() => {});
      });
    }

    activityService.log({
      userId: req.auth.userId,
      action: 'updated milestone',
      entityType: 'milestone',
      entityId: milestone._id,
      entityTitle: milestone.name,
    });
    return success(res, milestone);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Milestone');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    const milestone = await milestoneService.getMilestoneById(req.params.id).catch(() => null);
    await milestoneService.deleteMilestone(req.params.id);
    activityService.log({
      userId: req.auth.userId,
      action: 'deleted milestone',
      entityType: 'milestone',
      entityId: req.params.id,
      entityTitle: milestone?.name || '',
    });
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, getOne, create, update, remove };
