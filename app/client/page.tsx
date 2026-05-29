'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ITask, IMeeting } from '@/lib/types';
import { formatDate, getDaysRemaining, isOverdue } from '@/lib/utils';
import { LogOut, CheckCircle2, Clock, Video, BarChart2, AlertTriangle, Calendar } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress',
  completed: 'Completed', blocked: 'Blocked', delayed: 'Delayed',
};

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  not_started: { bg: '#F3F4F6', color: '#6B7280' },
  in_progress: { bg: '#EEF2FF', color: '#6366F1' },
  completed: { bg: '#ECFDF5', color: '#10B981' },
  blocked: { bg: '#FEF2F2', color: '#EF4444' },
  delayed: { bg: '#FFFBEB', color: '#F59E0B' },
};

export default function ClientPortal() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    // Only clients access this portal; internal users go to dashboard
    if (user.role !== 'client') { router.replace('/'); return; }

    const init = async () => {
      try {
        const [tRes, mRes] = await Promise.all([
          fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
          fetch(apiUrl('/api/meetings'), { credentials: 'include' }),
        ]);
        const [tData, mData] = await Promise.all([tRes.json(), mRes.json()]);
        if (tData.success) setTasks(tData.data);
        if (mData.success) setMeetings(mData.data);
      } finally { setLoading(false); }
    };
    init();
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <p style={{ color: '#6B7280', fontSize: 14 }}>Loading your portal...</p>
      </div>
    );
  }

  if (!user || user.role !== 'client') return null;

  const now = new Date();
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter(t => t.endDate && isOverdue(t.endDate, t.status));
  const upcoming = meetings
    .filter(m => new Date(m.date) >= now && m.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Group tasks by milestone for project progress view
  const milestones = new Map<string, ITask[]>();
  tasks.forEach(t => {
    const m = t.milestone || 'General';
    if (!milestones.has(m)) milestones.set(m, []);
    milestones.get(m)!.push(t);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top nav */}
      <header style={{
        height: 56, background: '#fff', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden' }}>
            <Image src="/logo.jpg" alt="B4U" width={28} height={28} style={{ objectFit: 'cover' }} />
          </div>
          <span style={{
            fontSize: 13, fontWeight: 800,
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #92400E 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Client Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, color: '#6B7280' }}>Welcome, {user.name}</span>
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              color: '#6B7280', background: 'none', border: '1px solid #E5E7EB',
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            }}
          >
            <LogOut style={{ width: 13, height: 13 }} />
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Heading */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
            Project Overview
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Tasks', value: total, icon: BarChart2, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Completed', value: completed, icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
            { label: 'In Progress', value: inProgress, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart2, color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Upcoming Meetings', value: upcoming.length, icon: Video, color: '#3B82F6', bg: '#EFF6FF' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
              padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, margin: 0 }}>{card.label}</p>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon style={{ width: 14, height: 14, color: card.color }} />
                </div>
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Overall Progress</h2>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>{completionRate}%</span>
          </div>
          <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5 }}>
            <div style={{
              height: '100%', width: `${completionRate}%`, borderRadius: 5,
              background: completionRate >= 80 ? '#10B981' : completionRate >= 50 ? '#6366F1' : '#F59E0B',
              transition: 'width 0.5s',
            }} />
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0' }}>
            {completed} of {total} tasks completed
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Milestones / Project sections */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Milestones</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {milestones.size === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>No milestones yet</div>
              ) : (
                Array.from(milestones.entries()).map(([name, milestoneTasks]) => {
                  const done = milestoneTasks.filter(t => t.status === 'completed').length;
                  const pct = milestoneTasks.length > 0 ? Math.round((done / milestoneTasks.length) * 100) : 0;
                  return (
                    <div key={name} style={{
                      background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{name}</p>
                        <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#10B981' : '#6366F1' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, background: '#F3F4F6', borderRadius: 3, marginBottom: 6 }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, borderRadius: 3,
                          background: pct === 100 ? '#10B981' : '#6366F1',
                        }} />
                      </div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{done} / {milestoneTasks.length} tasks done</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Upcoming Meetings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>No upcoming meetings</div>
              ) : (
                upcoming.map(m => (
                  <div key={m._id} style={{
                    background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{m.title}</p>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar style={{ width: 11, height: 11 }} />
                      {formatDate(m.date)} · {m.startTime} – {m.endTime}
                    </p>
                    {m.googleMeetLink && (
                      <a
                        href={m.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 600, color: '#059669',
                          background: '#ECFDF5', border: '1px solid #A7F3D0',
                          padding: '4px 10px', borderRadius: 6, textDecoration: 'none',
                        }}
                      >
                        <Video style={{ width: 11, height: 11 }} />
                        Join Meeting
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div style={{
            marginTop: 24, background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>
              <strong>{overdue.length} task{overdue.length > 1 ? 's are' : ' is'} overdue.</strong>
              {' '}Please contact your project manager.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
