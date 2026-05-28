import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TaskStatus, TaskPriority } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | Date, style: 'short' | 'long' | 'relative' = 'short'): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / 86400000);

  if (style === 'relative') {
    if (Math.abs(diffDays) < 1) return 'today';
    if (diffDays === -1) return 'yesterday';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    return `in ${diffDays}d`;
  }

  if (style === 'long') {
    return date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function getDaysRemaining(endDate: string): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function isOverdue(endDate: string, status: TaskStatus): boolean {
  if (status === 'completed') return false;
  return getDaysRemaining(endDate) < 0;
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  delayed: 'Delayed',
};

export const STATUS_COLORS: Record<TaskStatus, { text: string; bg: string; dot: string }> = {
  not_started: { text: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  in_progress: { text: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  completed: { text: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  blocked: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  delayed: { text: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-400' },
};

export const PRIORITY_COLORS: Record<TaskPriority, { text: string; bg: string }> = {
  low: { text: 'text-slate-500', bg: 'bg-slate-100' },
  medium: { text: 'text-amber-700', bg: 'bg-amber-50' },
  high: { text: 'text-red-700', bg: 'bg-red-50' },
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
