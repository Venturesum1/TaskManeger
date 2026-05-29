const TASK_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  DELAYED: 'delayed',
};

const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

const USER_ROLE = {
  ADMIN: 'admin',
  MEMBER: 'member',
};

const NOTIFICATION_TYPE = {
  TASK_DUE: 'task_due',
  TASK_OVERDUE: 'task_overdue',
  TASK_ASSIGNED: 'task_assigned',
  MEETING_REMINDER: 'meeting_reminder',
  MEETING_INVITE: 'meeting_invite',
  GENERAL: 'general',
};

const EMAIL_TYPE = {
  TASK_REMINDER: 'task_reminder',
  DEADLINE_REMINDER: 'deadline_reminder',
  MEETING_INVITE: 'meeting_invite',
  MEETING_UPDATE: 'meeting_update',
  WELCOME: 'welcome',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
};

const CRON_SCHEDULE = {
  EVERY_MORNING: '0 9 * * *',
  EVERY_HOUR: '0 * * * *',
};

module.exports = {
  TASK_STATUS,
  TASK_PRIORITY,
  USER_ROLE,
  NOTIFICATION_TYPE,
  EMAIL_TYPE,
  HTTP_STATUS,
  CRON_SCHEDULE,
};
