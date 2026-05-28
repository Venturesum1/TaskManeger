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
import { ArrowRight, Video, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  const upcomingMeetings = meetings
    .filter(m => new Date(m.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const overdueTasks = tasks.filter(t => t.endDate && isOverdue(t.endDate, t.status));

  return (
    <AppLayout>
      <Header title="Dashboard" />

      <div className="page-content flex-1">
        {/* Welcome banner */}
        <div className="mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning 🌅' : h < 17 ? 'Good afternoon ☀️' : h < 21 ? 'Good evening 🌆' : 'Good night 🌙'; })()} 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
              {' '}Email reminders have been queued.
            </p>
            <Link href="/tasks">
              <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                View →
              </span>
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6">
          {loading
            ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="stat-card" style={{ height: 88 }}>
                    <div style={{ height: 12, width: '60%', background: '#F3F4F6', borderRadius: 4, marginBottom: 12 }} />
                    <div style={{ height: 28, width: '40%', background: '#F3F4F6', borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            : <StatsCards tasks={tasks} />
          }
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Tasks */}
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
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                                  {task.milestone}
                                </p>
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

          {/* Upcoming Meetings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ margin: 0 }}>Upcoming Meetings</h3>
              <Link href="/meetings">
                <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
                  View all
                </span>
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {loading ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>
              ) : upcomingMeetings.length === 0 ? (
                <div
                  className="card"
                  style={{ padding: '32px 20px', textAlign: 'center' }}
                >
                  <Video style={{ width: 24, height: 24, color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming meetings</p>
                </div>
              ) : (
                upcomingMeetings.map(meeting => {
                  const dateStr = formatDate(meeting.date);
                  const isToday = new Date(meeting.date).toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={meeting._id}
                      className="card card-hover"
                      style={{ padding: '14px 16px', cursor: 'pointer' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: 14, margin: 0 }}>
                          {meeting.title}
                        </p>
                        {isToday && (
                          <span
                            className="badge"
                            style={{ background: '#EEF2FF', color: 'var(--primary)', flexShrink: 0 }}
                          >
                            Today
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock style={{ width: 12, height: 12 }} />
                          {dateStr} · {meeting.startTime}
                        </span>
                      </div>
                      {meeting.googleMeetLink && (
                        <a
                          href={meeting.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{
                            marginTop: 10, background: '#ECFDF5',
                            color: '#059669', fontSize: 12, height: 28,
                            border: '1px solid #A7F3D0', width: '100%',
                            justifyContent: 'center',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Video style={{ width: 12, height: 12 }} />
                          Join Google Meet
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
