'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import MeetingModal from '@/components/meetings/MeetingModal';
import { IMeeting, IUser } from '@/lib/types';
import { formatDate, formatTime, getInitials, buildWhatsAppLink } from '@/lib/utils';
import { Plus, Video, Clock, Users, Copy, ExternalLink, MessageCircle, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function MeetingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<IMeeting | null>(null);
  const [search, setSearch] = useState('');

  const fetchMeetings = async () => {
    try {
      const res = await fetch(apiUrl('/api/meetings'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMeetings(data.data);
    } catch { }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      const [mRes, uRes] = await Promise.all([
        fetch(apiUrl('/api/meetings'), { credentials: 'include' }),
        fetch(apiUrl('/api/users'), { credentials: 'include' }),
      ]);
      const [mData, uData] = await Promise.all([mRes.json(), uRes.json()]);
      if (mData.success) setMeetings(mData.data);
      if (uData.success) setUsers(uData.data);
      setLoading(false);
    };
    init();
  }, [authLoading, user]);

  const deleteMeeting = async (id: string) => {
    if (!confirm('Delete this meeting?')) return;
    await fetch(apiUrl(`/api/meetings/${id}`), { method: 'DELETE', credentials: 'include' });
    toast.success('Meeting deleted');
    fetchMeetings();
  };

  const filtered = meetings.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const upcoming = filtered.filter(m => new Date(m.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = filtered.filter(m => new Date(m.date) < new Date()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const MeetingCard = ({ meeting }: { meeting: IMeeting }) => {
    const isToday = new Date(meeting.date).toDateString() === new Date().toDateString();
    const isPast = new Date(meeting.date) < new Date();
    const participants = meeting.participants as IUser[];

    return (
      <div className="card card-hover" style={{ padding: '16px 20px' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>
                {meeting.title}
              </p>
              {isToday && (
                <span className="badge" style={{ background: '#EEF2FF', color: 'var(--primary)', fontSize: 10 }}>
                  Today
                </span>
              )}
              {isPast && (
                <span className="badge" style={{ background: '#F3F4F6', color: 'var(--text-muted)', fontSize: 10 }}>
                  Past
                </span>
              )}
            </div>

            {meeting.description && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{meeting.description}</p>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 12, height: 12 }} />
                {formatDate(meeting.date)} · {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
              </span>

              {participants.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
                  <div className="flex items-center gap-1">
                    {participants.slice(0, 4).map(p => (
                      <div
                        key={typeof p === 'object' ? p._id : p}
                        className="avatar avatar-sm"
                        style={{ background: 'var(--primary)', fontSize: 9 }}
                        title={typeof p === 'object' ? p.name : ''}
                      >
                        {typeof p === 'object' ? getInitials(p.name) : '?'}
                      </div>
                    ))}
                    {participants.length > 4 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{participants.length - 4}</span>
                    )}
                  </div>
                </div>
              )}

              {meeting.googleMeetLink && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Video style={{ width: 12, height: 12, color: '#059669' }} />
                  <a
                    href={meeting.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'monospace' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {meeting.googleMeetLink.replace('https://', '').slice(0, 36)}...
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {meeting.googleMeetLink && (
              <a
                href={meeting.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', height: 30, fontSize: 12 }}
              >
                <Video style={{ width: 12, height: 12 }} />
                Join
              </a>
            )}
            <button
              className="btn btn-ghost btn-icon-sm"
              title="Edit"
              onClick={() => { setEditMeeting(meeting); setShowModal(true); }}
            >
              <Edit2 style={{ width: 14, height: 14 }} />
            </button>
            <button
              className="btn btn-ghost btn-icon-sm"
              title="Send WhatsApp reminder"
              onClick={() => {
                const participant = (meeting.participants as IUser[]).find(p => typeof p === 'object' && p.phone);
                if (!participant || typeof participant !== 'object' || !participant.phone) {
                  toast.error('No participant with phone number'); return;
                }
                const msg = `📅 Reminder: ${meeting.title}\n${formatDate(meeting.date)} · ${formatTime(meeting.startTime)}\n🎥 ${meeting.googleMeetLink}`;
                window.open(buildWhatsAppLink(participant.phone, msg), '_blank');
              }}
            >
              <MessageCircle style={{ width: 14, height: 14, color: '#25D366' }} />
            </button>
            <button
              className="btn btn-ghost btn-icon-sm"
              title="Delete"
              onClick={() => deleteMeeting(meeting._id)}
            >
              <Trash2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <Header
        title="Meetings"
        searchPlaceholder="Search meetings..."
        onSearch={setSearch}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditMeeting(null); setShowModal(true); }}>
            <Plus style={{ width: 15, height: 15 }} />
            <Video style={{ width: 14, height: 14 }} />
            Schedule Meeting
          </button>
        }
      />

      <div className="page-content flex-1">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Meetings', value: meetings.length, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Upcoming', value: upcoming.length, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Past Meetings', value: past.length, color: '#6B7280', bg: '#F3F4F6' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <p className="section-title">Upcoming ({upcoming.length})</p>
                <div className="flex flex-col gap-3">
                  {upcoming.map(m => <MeetingCard key={m._id} meeting={m} />)}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <p className="section-title">Past ({past.length})</p>
                <div className="flex flex-col gap-3" style={{ opacity: 0.65 }}>
                  {past.map(m => <MeetingCard key={m._id} meeting={m} />)}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><Video style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
                <p style={{ fontWeight: 500, color: 'var(--text)' }}>No meetings yet</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                  <Plus style={{ width: 14, height: 14 }} /> Schedule one
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <MeetingModal
          meeting={editMeeting}
          users={users}
          onClose={() => { setShowModal(false); setEditMeeting(null); }}
          onSaved={fetchMeetings}
        />
      )}
    </AppLayout>
  );
}
