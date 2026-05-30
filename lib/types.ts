export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'delayed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type UserRole = 'admin' | 'manager' | 'member' | 'client';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type ProjectHealth = 'healthy' | 'at_risk' | 'delayed';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  // Security fields
  isFirstLogin?: boolean;
  forcePasswordChange?: boolean;
  requiresPasswordChange?: boolean;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lastLogin?: string;
  passwordChangedAt?: string;
  createdAt: string;
}

export interface ITask {
  _id: string;
  title: string;
  description?: string;
  owner: IUser | string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  endDate?: string;
  milestone?: string;
  createdBy?: IUser | string;
  estimatedHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMeeting {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  participants: IUser[] | string[];
  googleMeetLink: string;
  organizer: IUser | string;
  reminderSent: boolean;
  status: MeetingStatus;
  createdAt: string;
}

export interface IComment {
  _id: string;
  task: string;
  author: IUser;
  content: string;
  mentions: IUser[];
  createdAt: string;
  updatedAt: string;
}

export interface IAttachment {
  _id: string;
  task: string;
  uploadedBy: IUser;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface ITimeEntry {
  _id: string;
  task: string;
  user: IUser;
  startedAt?: string;
  stoppedAt?: string;
  duration: number;
  isRunning: boolean;
  createdAt: string;
}

export interface IActivity {
  _id: string;
  user: IUser;
  action: string;
  entityType: 'task' | 'meeting' | 'user' | 'comment' | 'attachment' | 'system';
  entityId?: string;
  entityTitle?: string;
  details?: string;
  createdAt: string;
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  clientId?: IUser | string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  progress: number;
  teamMembers: IUser[];
  createdBy: IUser | string;
  taskCount?: number;
  milestoneCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMilestone {
  _id: string;
  projectId: IProject | string;
  name: string;
  description?: string;
  owner?: IUser | string;
  status: MilestoneStatus;
  progress: number;
  startDate?: string;
  endDate?: string;
  tasks?: ITask[];
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  _id: string;
  user: string;
  type: 'task_due' | 'task_overdue' | 'meeting_reminder' | 'task_assigned' | 'task_updated' |
        'task_completed' | 'comment_mention' | 'deadline_reminder' | 'milestone_completed' |
        'project_updated' | 'system_notification' | 'general';
  title?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface TaskFilters {
  search: string;
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  owner: string;
}

export interface AnalyticsData {
  kpis: {
    totalTasks: number;
    pending: number;
    completed: number;
    completedThisMonth: number;
    overdue: number;
    upcomingMeetings: number;
  };
  tasksByStatus: Array<{ name: string; value: number; color: string }>;
  tasksByUser: Array<{ _id: string; name: string; total: number; completed: number; inProgress: number; blocked: number }>;
}
