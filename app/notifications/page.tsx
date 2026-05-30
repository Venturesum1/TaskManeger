'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { INotification } from '@/lib/types';
import {
  Bell, CheckSquare, Video, MessageSquare, Flag, FolderKanban,
  AlertTriangle, Clock, Info, CheckCheck, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const TYPE_CFG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  task_assigned:       { icon: CheckSquare,   color: '#6366F1', bg: '#EEF2FF', label: 'Task Assigned' },
  task_updated:        { icon: CheckSquare,   color: '#8B5CF6', bg: '#F5F3FF', label: 'Task Updated' },
  task_completed:      { icon: CheckSquare,   color: '#10B981', bg: '#ECFDF5', label: 'Task Completed' },
  task_due:            { icon: Clock,         color: '#F59E0B', bg: '#FFFBEB', label: 'Due Soon' },
  task_overdue:        { icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', label: 'Overdue' },
  deadline_reminder:   { icon: Clock,         color: '#F59E0B', bg: '#FFFBEB', label: 'Deadline' },
  meeting_reminder:    { icon: Video,         color: '#3B82F6', bg: '#EFF6FF', label: 'Meeting' },
  meeting_invite:      { icon: Video,         color: '#3B82F6', bg: '#EFF6FF', label: 'Meeting Invite' },
  comment_mention:     { icon: MessageSquare, color: '#8B5CF6', bg: '#F5F3FF', label: 'Mention' },
  milestone_completed: { icon: Flag,          color: '#10B981', bg: '#ECFDF5', label: 'Milestone' },
  project_updated:     { icon: FolderKanban,  color: '#6366F1', bg: '#EEF2FF', label: 'Project' },
  system_notification: { icon: Info,          color: '#6B7280', bg: '#F3F4F6', label: 'System' },
  general:             { icon: Bell,          color: '#6B7280', bg: '#F3F4F6', label: 'General' },
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchNotifications = async () => {
    try {
      const res = await fetch(apiUrl('/api/notifications'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } catch { toast.error('Failed to load notifications'); }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchNotifications();
  }, [authLoading, user]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/notifications/${id}/read`), { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(apiUrl('/api/notifications/mark-all-read'), { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/notifications/${id}`), { method: 'DELETE', credentials: 'include' });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const filtered = useMemo(() => {
    let arr = notifications;
    if (tab === 'unread') arr = arr.filter(n => !n.read);
    if (filterType !== 'all') arr = arr.filter(n => n.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [notifications, tab, filterType, search]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const uniqueTypes = Array.from(new Set(notifications.map(n => n.type)));

  return (
    <AppLayout>
      <Header title="Notifications" searchPlaceholder="Search notifications..." onSearch={setSearch} />

      <div className="page-content flex-1">
        {/* Controls bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-1" style={{
            background: '#F3F4F6', borderRadius: 8, padding: 3,
          }}>
            {(['all', 'unread'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  fontWeight: tab === t ? 600 : 400,
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                  border: 'none',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {t === 'all' ? 'All' : `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
              </button>
            ))}
          </div>

          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="input input-sm" style={{ width: 'auto', minWidth: 140 }}>
            <option value="all">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{TYPE_CFG[t]?.label || t}</option>
            ))}
          </select>

          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCheck style={{ width: 14, height: 14 }} />
              Mark all read
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Notification list */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Bell style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
            <p style={{ fontWeight: 500, color: 'var(--text)' }}>
              {tab === 'unread' ? 'All caught up!' : 'No notifications'}
            </p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              {tab === 'unread' ? 'No unread notifications.' : 'Notifications will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(notif => {
              const cfg = TYPE_CFG[notif.type] || TYPE_CFG.general;
              const IconCmp = cfg.icon;
              return (
                <div
                  key={notif._id}
                  onClick={() => !notif.read && handleMarkRead(notif._id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 16px', background: notif.read ? '#fff' : '#FAFAFE',
                    borderRadius: 10, border: `1px solid ${notif.read ? 'var(--border-subtle)' : 'var(--border)'}`,
                    cursor: notif.read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                    position: 'relative',
                  }}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <div style={{
                      position: 'absolute', top: 14, right: 60,
                      width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)',
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, background: cfg.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <IconCmp style={{ width: 16, height: 16, color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color,
                        background: cfg.bg, padding: '1px 7px', borderRadius: 10 }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(notif.createdAt)}</span>
                    </div>
                    {notif.title && (
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>
                        {notif.title}
                      </p>
                    )}
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      {notif.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    {!notif.read && (
                      <button
                        className="btn btn-ghost btn-icon-sm"
                        title="Mark as read"
                        onClick={e => { e.stopPropagation(); handleMarkRead(notif._id); }}
                      >
                        <CheckCheck style={{ width: 14, height: 14, color: 'var(--primary)' }} />
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-icon-sm"
                      title="Delete"
                      onClick={e => { e.stopPropagation(); handleDelete(notif._id); }}
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
