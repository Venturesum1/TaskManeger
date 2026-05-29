const cron = require('node-cron');
const meetingService = require('../services/meetingService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const { CRON_SCHEDULE } = require('../constants');
const logger = require('../utils/logger');

async function runMeetingCheck() {
  logger.info('[MeetingReminderJob] Checking upcoming meetings...');
  try {
    const meetings = await meetingService.getUpcomingMeetings(60);
    logger.info('[MeetingReminderJob] Found meetings', { count: meetings.length });

    for (const meeting of meetings) {
      const participants = Array.isArray(meeting.participants) ? meeting.participants : [];

      for (const participant of participants) {
        if (typeof participant !== 'object' || !participant.email) continue;

        emailService.sendMeetingReminder({
          to: participant.email,
          title: meeting.title,
          date: meeting.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          meetLink: meeting.googleMeetLink || '',
        }).catch((err) =>
          logger.error('[MeetingReminderJob] Email failed', {
            meetingId: meeting._id,
            participant: participant.email,
            error: err.message,
          })
        );

        notificationService.createNotification({
          userId: participant._id,
          type: 'meeting_reminder',
          title: 'Meeting Starting Soon',
          message: `"${meeting.title}" starts in 1 hour at ${meeting.startTime}.`,
          metadata: {
            meetingId: meeting._id,
          },
        }).catch(() => {});
      }

      await meetingService.markReminderSent(meeting._id);
    }

    logger.info('[MeetingReminderJob] Completed');
  } catch (err) {
    logger.error('[MeetingReminderJob] Error', { error: err.message });
  }
}

function start() {
  cron.schedule(CRON_SCHEDULE.EVERY_HOUR, runMeetingCheck);
  logger.info('[MeetingReminderJob] Scheduled — runs every hour');
}

module.exports = { start, runMeetingCheck };
