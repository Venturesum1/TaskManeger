'use client';
import { TaskStatus, TaskPriority } from '@/lib/types';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/utils';

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_COLORS[status];
  return (
    <span className={`badge ${cfg.text} ${cfg.bg}`}>
      <span className={`badge-dot ${cfg.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_COLORS[priority];
  return (
    <span className={`badge ${cfg.text} ${cfg.bg}`} style={{ fontWeight: 500 }}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
