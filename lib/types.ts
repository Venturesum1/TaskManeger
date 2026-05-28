export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'delayed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type UserRole = 'admin' | 'member';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
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
  createdAt: string;
}

export interface INotification {
  _id: string;
  user: string;
  type: 'task_due' | 'task_overdue' | 'meeting_reminder' | 'task_assigned';
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
