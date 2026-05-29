const Meeting = require('../models/Meeting');
const { connectDB } = require('../database/mongodb');
const googleMeetService = require('./googleMeetService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

const POPULATE_PARTICIPANTS = 'name email phone';
const POPULATE_ORGANIZER = 'name email';

async function listMeetings() {
  await connectDB();
  return Meeting.find()
    .populate('participants', POPULATE_PARTICIPANTS)
    .populate('organizer', POPULATE_ORGANIZER)
    .sort({ date: 1 })
    .lean();
}

async function createMeeting({ title, description, date, startTime, endTime, participants, organizerId }) {
  await connectDB();
  if (!title?.trim() || !date || !startTime || !endTime) {
    throw Object.assign(
      new Error('Title, date, start and end time are required'),
      { statusCode: 400 }
    );
  }

  let meetLink = '';
  try {
    meetLink = await googleMeetService.createGoogleMeet({ title: title.trim(), date, startTime, endTime });
    logger.info('[MeetingService] Google Meet created', { title, meetLink });
  } catch (err) {
    logger.error('[MeetingService] Google Meet creation failed — continuing without link', { error: err.message });
  }

  const meeting = await Meeting.create({
    title: title.trim(),
    description,
    date,
    startTime,
    endTime,
    participants: participants || [],
    googleMeetLink: meetLink,
    organizer: organizerId,
  });

  await meeting.populate([
    { path: 'participants', select: POPULATE_PARTICIPANTS },
    { path: 'organizer', select: POPULATE_ORGANIZER },
  ]);

  emailService.sendMeetingInvite({
    participants: meeting.participants,
    title: meeting.title,
    date,
    startTime,
    endTime,
    meetLink,
    subject: `Meeting Invite: ${meeting.title}`,
  }).catch((err) => logger.error('[MeetingService] Invite email failed', { error: err.message }));

  (participants || []).forEach((userId) => {
    notificationService.createNotification({
      userId,
      type: 'meeting_invite',
      title: 'New Meeting Scheduled',
      message: `You have been invited to "${meeting.title}" on ${new Date(date).toLocaleDateString()}`,
      metadata: { meetingId: meeting._id },
    }).catch(() => {});
  });

  logger.info('[MeetingService] Meeting created', { meetingId: meeting._id, title: meeting.title });
  return meeting;
}

async function updateMeeting(id, updates) {
  await connectDB();
  const meeting = await Meeting.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate('participants', POPULATE_PARTICIPANTS)
    .populate('organizer', POPULATE_ORGANIZER)
    .lean();
  if (!meeting) throw Object.assign(new Error('Meeting not found'), { statusCode: 404 });

  emailService.sendMeetingInvite({
    participants: meeting.participants,
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    meetLink: meeting.googleMeetLink,
    subject: `Meeting Updated: ${meeting.title}`,
  }).catch((err) => logger.error('[MeetingService] Update email failed', { error: err.message }));

  logger.info('[MeetingService] Meeting updated', { meetingId: id });
  return meeting;
}

async function cancelMeeting(id) {
  await connectDB();
  await Meeting.findByIdAndDelete(id);
  logger.info('[MeetingService] Meeting cancelled', { meetingId: id });
}

async function getUpcomingMeetings(withinMinutes = 60) {
  await connectDB();
  const now = new Date();
  const future = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const all = await Meeting.find({ date: { $gte: now, $lte: future }, reminderSent: false })
    .populate('participants', POPULATE_PARTICIPANTS)
    .lean();

  return all;
}

async function markReminderSent(id) {
  await connectDB();
  await Meeting.findByIdAndUpdate(id, { reminderSent: true });
}

module.exports = {
  listMeetings,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  getUpcomingMeetings,
  markReminderSent,
};
