const meetingService = require('../services/meetingService');
const activityService = require('../services/activityService');
const { success, created, fail, notFound, serverError } = require('../helpers');

async function list(req, res) {
  try {
    const meetings = await meetingService.listMeetings();
    return success(res, meetings);
  } catch (err) {
    return serverError(res, err);
  }
}

async function create(req, res) {
  try {
    const meeting = await meetingService.createMeeting({ ...req.body, organizerId: req.auth.userId });
    activityService.log({
      userId: req.auth.userId,
      action: 'scheduled meeting',
      entityType: 'meeting',
      entityId: meeting._id,
      entityTitle: meeting.title,
    });
    return created(res, meeting);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const meeting = await meetingService.updateMeeting(req.params.id, req.body);
    const action = req.body.status === 'cancelled'
      ? 'cancelled meeting'
      : req.body.status === 'completed'
        ? 'completed meeting'
        : 'updated meeting';
    activityService.log({
      userId: req.auth.userId,
      action,
      entityType: 'meeting',
      entityId: meeting._id,
      entityTitle: meeting.title,
    });
    return success(res, meeting);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Meeting');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    await meetingService.cancelMeeting(req.params.id);
    activityService.log({
      userId: req.auth.userId,
      action: 'cancelled meeting',
      entityType: 'meeting',
      entityId: req.params.id,
    });
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, create, update, remove };
