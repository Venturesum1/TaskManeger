'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import MeetingModal from '@/components/meetings/MeetingModal';
import { IMeeting, IUser, MeetingStatus } from '@/lib/types';
import { formatDate, formatTime, getInitials, buildWhatsAppLink } from '@/lib/utils';
import { Plus, Video, Clock, Users, MessageCircle, Trash2, Edit2, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_CFG: Record<MeetingStatus, { label: string; bg: string; color: string; icon: any }> = {
  scheduled: { label: 'Scheduled', bg: '#EEF2FF', color: '#6366F1', icon: Calendar },
  completed: { label: 'Completed', bg: '#ECFDF5', color: '#10B981', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#EF4444', icon: XCircle },
};

function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
      background: cfg.bg, color: cfg.color,
    }}>
      <cfg.icon style={{ width: 10, height: 10 }} />
      {cfg.label}
    </span>
  );
}

export default function MeetingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<IMeeting | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const updateStatus = async (id: string, status: MeetingStatus) => {
    const res = await fetch(apiUrl(`/api/meetings/${id}`), {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      setMeetings(prev => prev.map(m => m._id === id ? { ...m, status } : m));
      toast.success(`Meeting marked as ${status}`);
    }
  };

  const filtered = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const now = new Date();
  const upcoming = filtered.filter(m => new Date(m.date) >= now && m.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = filtered.filter(m => new Date(m.date) < now || m.status === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const MeetingCard = ({ meeting }: { meeting: IMeeting }) => {
    const isToday = new Date(meeting.date).toDateString() === now.toDateString();
    const participants = meeting.participants as IUser[];
    const meetingStatus = meeting.status || 'scheduled';

    return (
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>
                {meeting.title}
              </p>
              <MeetingStatusBadge status={meetingStatus as MeetingStatus} />
              {isToday && meetingStatus === 'scheduled' && (
                <span className="badge" style={{ background: '#FFF7ED', color: '#EA580C', fontSize: 10, fontWeight: 700 }}>
                  Today
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
                        key={typeof p === 'object' ? p._id : String(p)}
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {meeting.googleMeetLink && meetingStatus === 'scheduled' && (
              <a
                href={meeting.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', height: 30, fontSize: 12, fontWeight: 600 }}
              >
                <Video style={{ width: 12, height: 12 }} />
                Join Meeting
              </a>
            )}
            {meetingStatus === 'scheduled' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, height: 28 }}
                title="Mark as completed"
                onClick={() => updateStatus(meeting._id, 'completed')}
              >
                <CheckCircle2 style={{ width: 12, height: 12, color: '#10B981' }} />
                Done
              </button>
            )}
            {meetingStatus === 'scheduled' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, height: 28 }}
                title="Cancel meeting"
                onClick={() => updateStatus(meeting._id, 'cancelled')}
              >
                <XCircle style={{ width: 12, height: 12, color: '#EF4444' }} />
                Cancel
              </button>
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
              title="WhatsApp reminder"
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
            Schedule Meeting
          </button>
        }
      />

      <div className="page-content flex-1">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: meetings.length, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Scheduled', value: meetings.filter(m => (m.status || 'scheduled') === 'scheduled').length, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Completed', value: meetings.filter(m => m.status === 'completed').length, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Cancelled', value: meetings.filter(m => m.status === 'cancelled').length, color: '#EF4444', bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 6px', fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {[
            { label: 'All', value: 'all' },
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              style={{
                padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                fontWeight: filterStatus === f.value ? 600 : 400,
                border: filterStatus === f.value ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: filterStatus === f.value ? 'var(--primary)' : 'var(--surface)',
                color: filterStatus === f.value ? '#fff' : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
        ) : (
          <div className="flex flex-col gap-6">
            {upcoming.length > 0 && (
              <section>
                <p className="section-title">Upcoming ({upcoming.length})</p>
                <div className="flex flex-col gap-3">
                  {upcoming.map(m => <MeetingCard key={m._id} meeting={m} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <p className="section-title">Past ({past.length})</p>
                <div className="flex flex-col gap-3" style={{ opacity: 0.7 }}>
                  {past.map(m => <MeetingCard key={m._id} meeting={m} />)}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><Video style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
                <p style={{ fontWeight: 500, color: 'var(--text)' }}>No meetings found</p>
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
