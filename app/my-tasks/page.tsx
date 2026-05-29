'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import TaskModal from '@/components/tasks/TaskModal';
import { StatusBadge, PriorityBadge } from '@/components/tasks/StatusBadge';
import { ITask, IUser, TaskStatus } from '@/lib/types';
import { formatDate, isOverdue, getDaysRemaining, STATUS_LABELS } from '@/lib/utils';
import { User, CheckCircle2, Clock, AlertTriangle, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const QUICK_FILTERS: { label: string; value: string; icon: any; color: string }[] = [
  { label: 'All', value: 'all', icon: User, color: '#6366F1' },
  { label: 'Pending', value: 'not_started', icon: Minus, color: '#94A3B8' },
  { label: 'In Progress', value: 'in_progress', icon: Clock, color: '#F59E0B' },
  { label: 'Completed', value: 'completed', icon: CheckCircle2, color: '#10B981' },
  { label: 'Blocked', value: 'blocked', icon: AlertTriangle, color: '#EF4444' },
];

export default function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<ITask | null>(null);
  const [search, setSearch] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await fetch(apiUrl('/api/tasks'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch { toast.error('Failed to load tasks'); }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      try {
        const [tRes, uRes] = await Promise.all([
          fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
          fetch(apiUrl('/api/users'), { credentials: 'include' }),
        ]);
        const [tData, uData] = await Promise.all([tRes.json(), uRes.json()]);
        if (tData.success) setTasks(tData.data);
        if (uData.success) setUsers(uData.data);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [authLoading, user]);

  const myTasks = useMemo(() => {
    if (!user) return [];
    let arr = tasks.filter(t => {
      const ownerId = typeof t.owner === 'object' ? t.owner._id : t.owner;
      return ownerId === user._id;
    });
    if (activeFilter !== 'all') arr = arr.filter(t => t.status === activeFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t => t.title.toLowerCase().includes(q));
    }
    return arr;
  }, [tasks, user, activeFilter, search]);

  // Count per status for quick filters
  const counts = useMemo(() => {
    if (!user) return {} as Record<string, number>;
    const myAll = tasks.filter(t => {
      const ownerId = typeof t.owner === 'object' ? t.owner._id : t.owner;
      return ownerId === user._id;
    });
    return {
      all: myAll.length,
      not_started: myAll.filter(t => t.status === 'not_started').length,
      in_progress: myAll.filter(t => t.status === 'in_progress').length,
      completed: myAll.filter(t => t.status === 'completed').length,
      blocked: myAll.filter(t => t.status === 'blocked').length,
    };
  }, [tasks, user]);

  const patchTask = async (id: string, updates: Partial<ITask>) => {
    try {
      const res = await fetch(apiUrl(`/api/tasks/${id}`), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) setTasks(prev => prev.map(t => t._id === id ? data.data : t));
    } catch { toast.error('Update failed'); }
  };

  return (
    <AppLayout>
      <Header
        title="My Tasks"
        searchPlaceholder="Search my tasks..."
        onSearch={setSearch}
        onNewTask={() => { setEditTask(null); setShowModal(true); }}
      />
      <div className="page-content flex-1">

        {/* Quick filter tabs */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {QUICK_FILTERS.map(f => {
            const active = activeFilter === f.value;
            const count = counts[f.value] ?? 0;
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  fontWeight: active ? 600 : 500, transition: 'all 0.15s',
                  border: active ? `1.5px solid ${f.color}` : '1.5px solid var(--border)',
                  background: active ? `${f.color}15` : 'var(--surface)',
                  color: active ? f.color : 'var(--text-muted)',
                }}
              >
                <f.icon style={{ width: 13, height: 13 }} />
                {f.label}
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: active ? f.color : 'var(--border)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  padding: '1px 6px', borderRadius: 10, minWidth: 20, textAlign: 'center',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Task cards */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
          </div>
        ) : myTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <User style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
            </div>
            <p style={{ fontWeight: 500, color: 'var(--text)' }}>
              {activeFilter === 'all' ? 'No tasks assigned to you' : `No ${STATUS_LABELS[activeFilter as TaskStatus] || activeFilter} tasks`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myTasks.map(task => {
              const late = task.endDate ? isOverdue(task.endDate, task.status) : false;
              const daysLeft = task.endDate ? getDaysRemaining(task.endDate) : null;
              const urgent = !late && daysLeft !== null && daysLeft <= 2 && task.status !== 'completed';

              return (
                <div
                  key={task._id}
                  className="card card-hover"
                  style={{
                    padding: '14px 20px', cursor: 'pointer',
                    borderLeft: `3px solid ${late ? '#EF4444' : urgent ? '#F59E0B' : 'transparent'}`,
                  }}
                  onClick={() => { setEditTask(task); setShowModal(true); }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <p style={{
                          fontWeight: 500, color: 'var(--text)', margin: 0, fontSize: 14,
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </p>
                      </div>
                      {task.description && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>

                  {(task.endDate || task.milestone) && (
                    <div className="flex items-center gap-4 mt-2">
                      {task.endDate && (
                        <span style={{
                          fontSize: 12,
                          color: late ? '#EF4444' : urgent ? '#F59E0B' : 'var(--text-muted)',
                          fontWeight: late || urgent ? 600 : 400,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Clock style={{ width: 11, height: 11 }} />
                          {late ? `Overdue · ${formatDate(task.endDate)}` : `Due ${formatDate(task.endDate)}`}
                        </span>
                      )}
                      {task.milestone && (
                        <span className="badge" style={{ background: '#EEF2FF', color: 'var(--primary)', fontSize: 11 }}>
                          {task.milestone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          users={users}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={fetchTasks}
        />
      )}
    </AppLayout>
  );
}
