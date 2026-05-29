const meetingService = require('../services/meetingService');
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
    return created(res, meeting);
  } catch (err) {
    if (err.statusCode === 400) return fail(res, err.message);
    return serverError(res, err);
  }
}

async function update(req, res) {
  try {
    const meeting = await meetingService.updateMeeting(req.params.id, req.body);
    return success(res, meeting);
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, 'Meeting');
    return serverError(res, err);
  }
}

async function remove(req, res) {
  try {
    await meetingService.cancelMeeting(req.params.id);
    return success(res, null);
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports = { list, create, update, remove };
