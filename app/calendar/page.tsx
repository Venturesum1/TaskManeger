'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import MeetingModal from '@/components/meetings/MeetingModal';
import { IMeeting, IUser } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils';
import { Plus, Video, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const FullCalendarDynamic = dynamic(() => import('@/components/calendar/FullCalendarWrapper'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 10, border: '1px solid var(--border)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading calendar...</p>
    </div>
  ),
});

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<IMeeting | null>(null);
  const [defaultDate, setDefaultDate] = useState('');

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      if (data.success) setMeetings(data.data);
    } catch { toast.error('Failed to load meetings'); }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      const [mRes, uRes] = await Promise.all([fetch('/api/meetings'), fetch('/api/users')]);
      const [mData, uData] = await Promise.all([mRes.json(), uRes.json()]);
      if (mData.success) setMeetings(mData.data);
      if (uData.success) setUsers(uData.data);
    };
    init();
  }, [authLoading, user]);

  const calendarEvents = meetings.map(m => ({
    id: m._id,
    title: m.title,
    start: `${m.date.split('T')[0]}T${m.startTime}`,
    end: `${m.date.split('T')[0]}T${m.endTime}`,
    backgroundColor: '#6366F1',
    borderColor: '#4F46E5',
    textColor: '#fff',
    extendedProps: { meeting: m },
  }));

  return (
    <AppLayout>
      <Header
        title="Calendar"
        actions={
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setEditMeeting(null); setDefaultDate(''); setShowModal(true); }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            <Video style={{ width: 14, height: 14 }} />
            New Meeting
          </button>
        }
      />

      <div className="page-content flex-1">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Calendar */}
          <div className="xl:col-span-3">
            <div className="card" style={{ padding: 20 }}>
              <FullCalendarDynamic
                events={calendarEvents}
                onDateClick={(dateStr: string) => {
                  setDefaultDate(dateStr);
                  setEditMeeting(null);
                  setShowModal(true);
                }}
                onEventClick={(meeting: IMeeting) => {
                  setEditMeeting(meeting);
                  setShowModal(true);
                }}
              />
            </div>
          </div>

          {/* Upcoming meetings panel */}
          <div>
            <h3 style={{ margin: '0 0 12px' }}>Upcoming</h3>
            <div className="flex flex-col gap-3">
              {meetings
                .filter(m => new Date(m.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 6)
                .map(m => {
                  const isToday = new Date(m.date).toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={m._id}
                      className="card card-hover"
                      style={{ padding: 14, cursor: 'pointer' }}
                      onClick={() => { setEditMeeting(m); setShowModal(true); }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
                          {m.title}
                        </p>
                        {isToday && (
                          <span className="badge" style={{ background: '#EEF2FF', color: 'var(--primary)', fontSize: 10, flexShrink: 0 }}>
                            Today
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                        {formatDate(m.date)} · {formatTime(m.startTime)}
                      </p>
                      {m.googleMeetLink && (
                        <a
                          href={m.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{
                            marginTop: 8, background: '#ECFDF5', color: '#059669',
                            border: '1px solid #A7F3D0', fontSize: 11, height: 26,
                            width: '100%', justifyContent: 'center',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Video style={{ width: 11, height: 11 }} />
                          Join Meet
                        </a>
                      )}
                    </div>
                  );
                })}
              {meetings.filter(m => new Date(m.date) >= new Date()).length === 0 && (
                <div
                  className="card"
                  style={{ padding: '28px 16px', textAlign: 'center' }}
                >
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming meetings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <MeetingModal
          meeting={editMeeting}
          users={users}
          defaultDate={defaultDate}
          onClose={() => { setShowModal(false); setEditMeeting(null); }}
          onSaved={fetchMeetings}
        />
      )}
    </AppLayout>
  );
}
