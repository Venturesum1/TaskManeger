'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import StatsCards from '@/components/dashboard/StatsCards';
import { ITask, IMeeting } from '@/lib/types';
import {
  formatDate, getDaysRemaining, isOverdue,
  STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS, getInitials,
} from '@/lib/utils';
import { ArrowRight, Video, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchData = async () => {
      try {
        const [tRes, mRes] = await Promise.all([
          fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
          fetch(apiUrl('/api/meetings'), { credentials: 'include' }),
        ]);
        const [tData, mData] = await Promise.all([tRes.json(), mRes.json()]);
        if (tData.success) setTasks(tData.data);
        if (mData.success) setMeetings(mData.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authLoading, user]);

  const recentTasks = tasks.slice(0, 8);
  const now = new Date();
  const todayStr = now.toDateString();

  const todayMeetings = meetings
    .filter(m => new Date(m.date).toDateString() === todayStr && m.status !== 'cancelled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingDeadlines = tasks
    .filter(t =>
      t.endDate &&
      t.status !== 'completed' &&
      !isOverdue(t.endDate, t.status) &&
      getDaysRemaining(t.endDate) <= 7
    )
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
    .slice(0, 6);

  const overdueTasks = tasks.filter(t => t.endDate && isOverdue(t.endDate, t.status));

  const deadlineColor = (daysLeft: number) => {
    if (daysLeft <= 0) return '#EF4444';
    if (daysLeft <= 1) return '#EF4444';
    if (daysLeft <= 3) return '#F59E0B';
    return '#10B981';
  };

  const deadlineLabel = (endDate: string) => {
    const d = getDaysRemaining(endDate);
    if (d < 0) return 'Overdue';
    if (d === 0) return 'Due Today';
    if (d === 1) return 'Due Tomorrow';
    return `Due in ${d} Days`;
  };

  return (
    <AppLayout>
      <Header title="Dashboard" />

      <div className="page-content flex-1">
        {/* Welcome banner */}
        <div className="mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {(() => { const h = now.getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'; })()}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <div
            className="flex items-center gap-3 mb-5 p-3 rounded-lg"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#B91C1C', margin: 0, flex: 1 }}>
              <strong>{overdueTasks.length} task{overdueTasks.length > 1 ? 's are' : ' is'} overdue.</strong>
              {' '}Please review and update.
            </p>
            <Link href="/tasks">
              <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                View →
              </span>
            </Link>
          </div>
        )}

        {/* Stats — 6 cards */}
        <div className="mb-6">
          {loading
            ? <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="stat-card" style={{ height: 88 }}>
                    <div style={{ height: 12, width: '60%', background: '#F3F4F6', borderRadius: 4, marginBottom: 12 }} />
                    <div style={{ height: 28, width: '40%', background: '#F3F4F6', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            : <StatsCards tasks={tasks} meetings={meetings} />
          }
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent Tasks — spans 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ margin: 0 }}>Recent Tasks</h3>
              <Link href="/tasks">
                <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <ArrowRight style={{ width: 14, height: 14 }} />
                </span>
              </Link>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><CheckCircle2 style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
                  <p style={{ fontWeight: 500, color: 'var(--text)' }}>No tasks yet</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Create your first task to get started</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map(task => {
                      const cfg = STATUS_COLORS[task.status];
                      const owner = typeof task.owner === 'object' ? task.owner : null;
                      const daysLeft = task.endDate ? getDaysRemaining(task.endDate) : null;
                      const late = task.endDate ? isOverdue(task.endDate, task.status) : false;
                      return (
                        <tr key={task._id}>
                          <td>
                            <div>
                              <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{task.title}</p>
                              {task.milestone && (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{task.milestone}</p>
                              )}
                            </div>
                          </td>
                          <td>
                            {owner ? (
                              <div className="flex items-center gap-2">
                                <div className="avatar avatar-sm" style={{ background: 'var(--primary)', fontSize: 9 }}>
                                  {getInitials(owner.name)}
                                </div>
                                <span style={{ fontSize: 13, color: 'var(--text)' }}>{owner.name.split(' ')[0]}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={`badge ${cfg.text} ${cfg.bg}`}>
                              <span className={`badge-dot ${cfg.dot}`} />
                              {STATUS_LABELS[task.status]}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 13,
                              color: late ? '#EF4444' : daysLeft !== null && daysLeft <= 2 ? '#F59E0B' : 'var(--text-muted)',
                              fontWeight: late ? 600 : 400,
                            }}>
                              {task.endDate ? formatDate(task.endDate) : '—'}
                              {late && ' · Overdue'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right column: Today's Meetings + Upcoming Deadlines */}
          <div className="flex flex-col gap-5">

            {/* Today's Meetings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ margin: 0 }}>Today's Meetings</h3>
                <Link href="/meetings">
                  <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>View all</span>
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {loading ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>
                ) : todayMeetings.length === 0 ? (
                  <div className="card" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <Calendar style={{ width: 20, height: 20, color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No meetings today</p>
                  </div>
                ) : (
                  todayMeetings.map(meeting => (
                    <div key={meeting._id} className="card" style={{ padding: '12px 14px' }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13, margin: 0 }}>
                          {meeting.title}
                        </p>
                        <MeetingStatusBadge status={meeting.status} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 11, height: 11 }} />
                        {meeting.startTime} – {meeting.endTime}
                      </span>
                      {meeting.googleMeetLink && (
                        <a
                          href={meeting.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{
                            marginTop: 8, background: '#ECFDF5', color: '#059669',
                            fontSize: 11, height: 26, border: '1px solid #A7F3D0',
                            width: '100%', justifyContent: 'center',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Video style={{ width: 11, height: 11 }} />
                          Join Google Meet
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ margin: 0 }}>Upcoming Deadlines</h3>
                <Link href="/tasks">
                  <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>View all</span>
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {loading ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>
                ) : upcomingDeadlines.length === 0 ? (
                  <div className="card" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <CheckCircle2 style={{ width: 20, height: 20, color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming deadlines</p>
                  </div>
                ) : (
                  upcomingDeadlines.map(task => {
                    const daysLeft = getDaysRemaining(task.endDate!);
                    const color = deadlineColor(daysLeft);
                    const label = deadlineLabel(task.endDate!);
                    return (
                      <div
                        key={task._id}
                        className="card"
                        style={{ padding: '10px 14px', borderLeft: `3px solid ${color}` }}
                      >
                        <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13, margin: '0 0 3px' }}>
                          {task.title}
                        </p>
                        <span style={{ fontSize: 12, color, fontWeight: 600 }}>
                          {label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MeetingStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    scheduled: { bg: '#EEF2FF', color: '#6366F1', label: 'Scheduled' },
    completed: { bg: '#ECFDF5', color: '#10B981', label: 'Completed' },
    cancelled: { bg: '#FEF2F2', color: '#EF4444', label: 'Cancelled' },
  };
  const c = cfg[status] || cfg.scheduled;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
      background: c.bg, color: c.color, flexShrink: 0,
    }}>
      {c.label}
    </span>
  );
}
