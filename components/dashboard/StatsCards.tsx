'use client';
import { ITask } from '@/lib/types';
import { CheckSquare, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { isOverdue } from '@/lib/utils';

interface Props {
  tasks: ITask[];
}

export default function StatsCards({ tasks }: Props) {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'not_started' || t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const upcoming = tasks.filter(t =>
    t.endDate && !isOverdue(t.endDate, t.status)
    && t.status !== 'completed'
    && (() => {
      const d = (new Date(t.endDate).getTime() - Date.now()) / 86400000;
      return d >= 0 && d <= 7;
    })()
  ).length;

  const cards = [
    {
      label: 'Total Tasks',
      value: total,
      icon: CheckSquare,
      color: '#6366F1',
      bg: '#EEF2FF',
    },
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      label: 'Due This Week',
      value: upcoming,
      icon: AlertTriangle,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              {card.label}
            </p>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: card.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <card.icon style={{ width: 16, height: 16, color: card.color }} />
            </div>
          </div>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
