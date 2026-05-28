'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import { X, Loader2, Video, MessageCircle, Mail } from 'lucide-react';
import { IMeeting, IUser } from '@/lib/types';
import { getInitials, formatDate, formatTime, buildWhatsAppLink } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  meeting?: IMeeting | null;
  users: IUser[];
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function MeetingModal({ meeting, users, defaultDate, onClose, onSaved }: Props) {
  const isEdit = !!meeting;
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    participantIds: [] as string[],
  });

  useEffect(() => {
    if (meeting) {
      setForm({
        title: meeting.title,
        description: meeting.description || '',
        date: new Date(meeting.date).toISOString().split('T')[0],
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        participantIds: meeting.participants.map(p => typeof p === 'object' ? p._id : p as string),
      });
    } else if (defaultDate) {
      setForm(f => ({ ...f, date: defaultDate }));
    }
  }, [meeting, defaultDate]);

  const set = (field: string, val: any) => setForm(f => ({ ...f, [field]: val }));

  const toggleParticipant = (uid: string) => {
    setForm(f => ({
      ...f,
      participantIds: f.participantIds.includes(uid)
        ? f.participantIds.filter(id => id !== uid)
        : [...f.participantIds, uid],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const url = isEdit ? apiUrl(`/api/meetings/${meeting!._id}`) : apiUrl('/api/meetings');
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description,
          date: form.date, startTime: form.startTime, endTime: form.endTime,
          participants: form.participantIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? 'Meeting updated' : 'Meeting scheduled! Real Google Meet link created');
        onSaved();
        onClose();
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!meeting || !confirm('Delete this meeting?')) return;
    setLoading(true);
    try {
      await fetch(apiUrl(`/api/meetings/${meeting._id}`), { method: 'DELETE', credentials: 'include' });
      toast.success('Meeting deleted');
      onSaved();
      onClose();
    } finally { setLoading(false); }
  };

  const sendWhatsAppReminder = () => {
    const participantUsers = users.filter(u => form.participantIds.includes(u._id));
    if (participantUsers.length === 0) { toast.error('Add participants first'); return; }
    const msg = `Meeting Reminder\n\n${form.title}\n${form.date} · ${form.startTime} – ${form.endTime}\n\nPlease join on time!`;
    const first = participantUsers.find(u => u.phone);
    if (!first?.phone) { toast.error('No participant has a phone number'); return; }
    window.open(buildWhatsAppLink(first.phone, msg), '_blank');
    toast.success(`WhatsApp reminder opened for ${first.name}`);
  };

  const sendEmailReminder = async () => {
    const participantUsers = users.filter(u => form.participantIds.includes(u._id) && u.email);
    // Always include yourself (current user) even if not in participants
    const allRecipients = [...participantUsers];
    if (currentUser?.email && !allRecipients.find(u => u.email === currentUser.email)) {
      allRecipients.push(currentUser as IUser);
    }
    if (allRecipients.length === 0) { toast.error('No recipients with email'); return; }
    const meetLink = meeting?.googleMeetLink || '';
    for (const u of allRecipients) {
      await fetch(apiUrl('/api/send-reminder'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meeting_reminder',
          to: u.email,
          subject: `Meeting Reminder: ${form.title}`,
          data: { title: form.title, date: form.date, startTime: form.startTime, endTime: form.endTime, meetLink },
        }),
      });
    }
    toast.success(`Email reminders sent to ${allRecipients.length} recipients`);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video style={{ width: 16, height: 16, color: '#059669' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: 16 }}>
              {isEdit ? 'Edit Meeting' : 'Schedule Meeting'}
            </h2>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="label">Meeting Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="input"
                placeholder="e.g. Sprint Planning, Client Review"
                required autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description / Agenda</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="input"
                placeholder="Meeting agenda, points to discuss..."
                rows={3}
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Start Time</label>
                <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">End Time</label>
                <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className="input" required />
              </div>
            </div>

            {/* Google Meet Link */}
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
            >
              <Video style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#065F46', margin: 0 }}>
                  Google Meet link will be auto-generated
                </p>
                <p style={{ fontSize: 11, color: '#059669', margin: 0, marginTop: 2 }}>
                  A real meeting room is created when you click Schedule
                </p>
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="label">
                Participants ({form.participantIds.length} selected)
              </label>
              <div className="flex flex-col gap-1.5" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {users.map(user => {
                  const selected = form.participantIds.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer"
                      style={{
                        background: selected ? '#EEF2FF' : 'var(--bg)',
                        border: `1px solid ${selected ? '#C7D2FE' : 'var(--border)'}`,
                        transition: 'all 0.1s',
                      }}
                      onClick={() => toggleParticipant(user._id)}
                    >
                      <div
                        className="avatar avatar-sm flex-shrink-0"
                        style={{ background: selected ? 'var(--primary)' : '#9CA3AF', fontSize: 9 }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1">
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{user.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{user.department || user.role}</p>
                      </div>
                      <div
                        style={{
                          width: 16, height: 16, borderRadius: 4,
                          background: selected ? 'var(--primary)' : 'var(--surface)',
                          border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {selected && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer flex-wrap gap-2">
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} disabled={loading}>
                Delete
              </button>
            )}

            {/* Reminder buttons */}
            <button type="button" onClick={sendWhatsAppReminder} className="btn btn-secondary btn-sm" disabled={form.participantIds.length === 0}>
              <MessageCircle style={{ width: 14, height: 14, color: '#25D366' }} />
              WhatsApp
            </button>
            <button type="button" onClick={sendEmailReminder} className="btn btn-secondary btn-sm" disabled={form.participantIds.length === 0}>
              <Mail style={{ width: 14, height: 14 }} />
              Email
            </button>

            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading
                ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
                : isEdit ? 'Update' : 'Schedule Meeting'
              }
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
