const PERMISSIONS = [
  // ─── Sidebar Visibility ────────────────────────────────────────────────────
  { key: 'sidebar.dashboard',     label: 'Dashboard',             category: 'Sidebar' },
  { key: 'sidebar.projects',      label: 'Projects',              category: 'Sidebar' },
  { key: 'sidebar.tasks',         label: 'Tasks',                 category: 'Sidebar' },
  { key: 'sidebar.my_tasks',      label: 'My Tasks',              category: 'Sidebar' },
  { key: 'sidebar.milestones',    label: 'Milestones',            category: 'Sidebar' },
  { key: 'sidebar.kanban',        label: 'Kanban',                category: 'Sidebar' },
  { key: 'sidebar.calendar',      label: 'Calendar',              category: 'Sidebar' },
  { key: 'sidebar.meetings',      label: 'Meetings',              category: 'Sidebar' },
  { key: 'sidebar.notifications', label: 'Notifications',         category: 'Sidebar' },
  { key: 'sidebar.team',          label: 'Team',                  category: 'Sidebar' },
  { key: 'sidebar.workload',      label: 'Workload',              category: 'Sidebar' },
  { key: 'sidebar.reports',       label: 'Reports',               category: 'Sidebar' },
  { key: 'sidebar.activity',      label: 'Activity',              category: 'Sidebar' },
  { key: 'sidebar.settings',      label: 'Settings',              category: 'Sidebar' },
  { key: 'sidebar.permissions',   label: 'Permission Management', category: 'Sidebar' },

  // ─── Projects ─────────────────────────────────────────────────────────────
  { key: 'projects.view',           label: 'View Projects',    category: 'Projects' },
  { key: 'projects.create',         label: 'Create Projects',  category: 'Projects' },
  { key: 'projects.edit',           label: 'Edit Projects',    category: 'Projects' },
  { key: 'projects.delete',         label: 'Delete Projects',  category: 'Projects' },
  { key: 'projects.assign_members', label: 'Assign Members',   category: 'Projects' },

  // ─── Milestones ───────────────────────────────────────────────────────────
  { key: 'milestones.view',   label: 'View Milestones',   category: 'Milestones' },
  { key: 'milestones.create', label: 'Create Milestones', category: 'Milestones' },
  { key: 'milestones.edit',   label: 'Edit Milestones',   category: 'Milestones' },
  { key: 'milestones.delete', label: 'Delete Milestones', category: 'Milestones' },

  // ─── Tasks ────────────────────────────────────────────────────────────────
  { key: 'tasks.view',            label: 'View Tasks',        category: 'Tasks' },
  { key: 'tasks.create',          label: 'Create Tasks',      category: 'Tasks' },
  { key: 'tasks.edit',            label: 'Edit Tasks',        category: 'Tasks' },
  { key: 'tasks.delete',          label: 'Delete Tasks',      category: 'Tasks' },
  { key: 'tasks.assign',          label: 'Assign Tasks',      category: 'Tasks' },
  { key: 'tasks.update_status',   label: 'Update Status',     category: 'Tasks' },
  { key: 'tasks.update_priority', label: 'Update Priority',   category: 'Tasks' },
  { key: 'tasks.comment',         label: 'Comment on Tasks',  category: 'Tasks' },
  { key: 'tasks.upload_files',    label: 'Upload Files',      category: 'Tasks' },
  { key: 'tasks.time_tracking',   label: 'Time Tracking',     category: 'Tasks' },

  // ─── Meetings ─────────────────────────────────────────────────────────────
  { key: 'meetings.view',           label: 'View Meetings',     category: 'Meetings' },
  { key: 'meetings.schedule',       label: 'Schedule Meetings', category: 'Meetings' },
  { key: 'meetings.edit',           label: 'Edit Meetings',     category: 'Meetings' },
  { key: 'meetings.delete',         label: 'Delete Meetings',   category: 'Meetings' },
  { key: 'meetings.invite_members', label: 'Invite Members',    category: 'Meetings' },
  { key: 'meetings.invite_clients', label: 'Invite Clients',    category: 'Meetings' },

  // ─── Reports ──────────────────────────────────────────────────────────────
  { key: 'reports.view',           label: 'View Reports',     category: 'Reports' },
  { key: 'reports.view_workload',  label: 'View Workload',    category: 'Reports' },
  { key: 'reports.view_analytics', label: 'View Analytics',   category: 'Reports' },

  // ─── Team ─────────────────────────────────────────────────────────────────
  { key: 'team.view',          label: 'View Team',      category: 'Team' },
  { key: 'team.add_member',    label: 'Add Members',    category: 'Team' },
  { key: 'team.edit_member',   label: 'Edit Members',   category: 'Team' },
  { key: 'team.delete_member', label: 'Delete Members', category: 'Team' },

  // ─── Settings ─────────────────────────────────────────────────────────────
  { key: 'settings.view',        label: 'View Settings',         category: 'Settings' },
  { key: 'settings.edit',        label: 'Edit Profile/Settings', category: 'Settings' },
  { key: 'settings.permissions', label: 'Permission Management', category: 'Settings' },
];

const ALL_KEYS = PERMISSIONS.map(p => p.key);

const ROLE_DEFAULTS = {
  admin: ALL_KEYS,

  manager: [
    'sidebar.dashboard', 'sidebar.projects', 'sidebar.tasks', 'sidebar.my_tasks',
    'sidebar.milestones', 'sidebar.kanban', 'sidebar.calendar', 'sidebar.meetings',
    'sidebar.notifications', 'sidebar.team', 'sidebar.workload', 'sidebar.reports',
    'sidebar.activity', 'sidebar.settings',
    'projects.view', 'projects.create', 'projects.edit', 'projects.assign_members',
    'milestones.view', 'milestones.create', 'milestones.edit', 'milestones.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
    'tasks.update_status', 'tasks.update_priority', 'tasks.comment',
    'tasks.upload_files', 'tasks.time_tracking',
    'meetings.view', 'meetings.schedule', 'meetings.edit', 'meetings.delete',
    'meetings.invite_members', 'meetings.invite_clients',
    'reports.view', 'reports.view_workload', 'reports.view_analytics',
    'team.view', 'team.add_member', 'team.edit_member',
    'settings.view', 'settings.edit',
  ],

  member: [
    'sidebar.dashboard', 'sidebar.tasks', 'sidebar.my_tasks',
    'sidebar.kanban', 'sidebar.calendar', 'sidebar.meetings',
    'sidebar.notifications', 'sidebar.settings',
    'projects.view',
    'milestones.view',
    'tasks.view', 'tasks.create', 'tasks.update_status',
    'tasks.comment', 'tasks.upload_files', 'tasks.time_tracking',
    'meetings.view',
    'settings.view', 'settings.edit',
  ],

  client: [
    'sidebar.dashboard', 'sidebar.meetings', 'sidebar.notifications',
    'projects.view',
    'milestones.view',
    'meetings.view',
  ],
};

module.exports = { PERMISSIONS, ROLE_DEFAULTS, ALL_KEYS };
