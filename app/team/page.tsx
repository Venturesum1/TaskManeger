'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { IUser, ITask, IMeeting, IActivity } from '@/lib/types';
import { getInitials, formatDate, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import { Plus, X, Loader2, Edit2, Trash2, Users, ChevronRight, Mail, Phone, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#EEF2FF', color: '#6366F1' },
  manager: { bg: '#F0FDF4', color: '#16A34A' },
  member: { bg: '#F3F4F6', color: '#6B7280' },
  client: { bg: '#FFF7ED', color: '#EA580C' },
};

function UserModal({ user, onClose, onSaved }: { user?: IUser | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'member',
    department: user?.department || '',
    phone: user?.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? apiUrl(`/api/users/${user!._id}`) : apiUrl('/api/users');
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit ? { name: form.name, role: form.role, department: form.department, phone: form.phone } : form;
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? 'Member updated' : 'Member added'); onSaved(); onClose(); }
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: 16 }}>{isEdit ? 'Edit Member' : 'Add Team Member'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required />
            </div>
            {!isEdit && (
              <>
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" required />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" required />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Engineering" />
              </div>
            </div>
            <div>
              <label className="label">Phone (for WhatsApp)</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} /> : isEdit ? 'Save' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProfileDrawer({
  member, tasks, meetings, activities, onClose, onEdit, canEdit,
}: {
  member: IUser;
  tasks: ITask[];
  meetings: IMeeting[];
  activities: IActivity[];
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const memberTasks = tasks.filter(t => (typeof t.owner === 'object' ? t.owner._id : t.owner) === member._id);
  const openTasks = memberTasks.filter(t => t.status !== 'completed');
  const completedTasks = memberTasks.filter(t => t.status === 'completed');
  const memberMeetings = meetings.filter(m =>
    (m.participants as any[]).some((p: any) => (typeof p === 'object' ? p._id : p) === member._id)
  );
  const memberActivities = activities.filter(a => (typeof a.user === 'object' ? a.user._id : a.user) === member._id).slice(0, 10);

  const [tab, setTab] = useState<'tasks' | 'meetings' | 'activity'>('tasks');

  const roleCfg = ROLE_COLORS[member.role] || ROLE_COLORS.member;

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 49,
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, maxWidth: '100vw',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <button className="btn btn-ghost btn-icon-sm" onClick={onClose}>
              <X style={{ width: 16, height: 16 }} />
            </button>
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={onEdit}>
                <Edit2 style={{ width: 13, height: 13 }} /> Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, background: 'var(--primary)' }}>
              {getInitials(member.name)}
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{member.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: roleCfg.bg, color: roleCfg.color,
                }}>
                  {member.role}
                </span>
                {member.department && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.department}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-4">
            <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <Mail style={{ width: 13, height: 13 }} /> {member.email}
            </div>
            {member.phone && (
              <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <Phone style={{ width: 13, height: 13 }} /> {member.phone}
              </div>
            )}
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Open', value: openTasks.length, color: '#F59E0B' },
              { label: 'Done', value: completedTasks.length, color: '#10B981' },
              { label: 'Meetings', value: memberMeetings.length, color: '#6366F1' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg)', borderRadius: 8 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {(['tasks', 'meetings', 'activity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none', border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
          {tab === 'tasks' && (
            <div className="flex flex-col gap-2">
              {memberTasks.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No tasks assigned</p>
              ) : memberTasks.map(task => (
                <div key={task._id} className="card" style={{ padding: '10px 14px' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{task.title}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  {task.endDate && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                      Due {formatDate(task.endDate)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'meetings' && (
            <div className="flex flex-col gap-2">
              {memberMeetings.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No meetings</p>
              ) : memberMeetings.map(m => (
                <div key={m._id} className="card" style={{ padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{m.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    {formatDate(m.date)} · {m.startTime}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'activity' && (
            <div className="flex flex-col gap-2">
              {memberActivities.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No recent activity</p>
              ) : memberActivities.map(act => (
                <div key={act._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 2px' }}>
                    {act.action}
                    {act.entityTitle && <span style={{ fontWeight: 600 }}> "{act.entityTitle}"</span>}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    {new Date(act.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [activities, setActivities] = useState<IActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<IUser | null>(null);
  const [selectedMember, setSelectedMember] = useState<IUser | null>(null);
  const { user: currentUser, loading: authLoading } = useAuth();
  const { can, loading: permLoading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!permLoading && currentUser && !can('sidebar.team')) router.replace('/');
  }, [permLoading, can, currentUser, router]);

  const fetchAll = async () => {
    try {
      const [uRes, tRes, mRes, aRes] = await Promise.all([
        fetch(apiUrl('/api/users'), { credentials: 'include' }),
        fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
        fetch(apiUrl('/api/meetings'), { credentials: 'include' }),
        fetch(apiUrl('/api/activities?limit=200'), { credentials: 'include' }),
      ]);
      const [uData, tData, mData, aData] = await Promise.all([uRes.json(), tRes.json(), mRes.json(), aRes.json()]);
      if (uData.success) setUsers(uData.data);
      if (tData.success) setTasks(tData.data);
      if (mData.success) setMeetings(mData.data);
      if (aData.success) setActivities(aData.data.activities);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!authLoading && currentUser) fetchAll(); }, [authLoading, currentUser]);

  const deleteUser = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await fetch(apiUrl(`/api/users/${id}`), { method: 'DELETE', credentials: 'include' });
    toast.success('Member removed');
    fetchAll();
  };

  const getMemberStats = (memberId: string) => {
    const assigned = tasks.filter(t => (typeof t.owner === 'object' ? t.owner._id : t.owner) === memberId);
    return {
      assigned: assigned.length,
      completed: assigned.filter(t => t.status === 'completed').length,
    };
  };

  return (
    <AppLayout>
      <Header
        title="Team"
        actions={
          currentUser?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setShowModal(true); }}>
              <Plus style={{ width: 15, height: 15 }} /> Add Member
            </button>
          )
        }
      />

      <div className="page-content flex-1">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Members', value: users.length, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Admins / Managers', value: users.filter(u => u.role === 'admin' || u.role === 'manager').length, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'completed').length, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Departments', value: new Set(users.map(u => u.department).filter(Boolean)).size, color: '#8B5CF6', bg: '#F5F3FF' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading team...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
            <p style={{ fontWeight: 500, color: 'var(--text)' }}>No team members yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Assigned Tasks</th>
                  <th>Completed</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(member => {
                  const stats = getMemberStats(member._id);
                  const roleCfg = ROLE_COLORS[member.role] || ROLE_COLORS.member;
                  return (
                    <tr
                      key={member._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedMember(member)}
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="avatar avatar-sm" style={{ background: 'var(--primary)', fontSize: 10 }}>
                            {getInitials(member.name)}
                          </div>
                          <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{member.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: roleCfg.bg, color: roleCfg.color,
                        }}>
                          {member.role}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{member.email}</span></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{member.phone || '—'}</span></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{member.department || '—'}</span></td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>{stats.assigned}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>{stats.completed}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="btn btn-ghost btn-icon-sm"
                            title="View Profile"
                            onClick={() => setSelectedMember(member)}
                          >
                            <ChevronRight style={{ width: 14, height: 14 }} />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <>
                              <button
                                className="btn btn-ghost btn-icon-sm"
                                title="Edit"
                                onClick={() => { setEditUser(member); setShowModal(true); }}
                              >
                                <Edit2 style={{ width: 13, height: 13 }} />
                              </button>
                              {member._id !== currentUser._id && (
                                <button
                                  className="btn btn-ghost btn-icon-sm"
                                  title="Remove"
                                  onClick={() => deleteUser(member._id)}
                                >
                                  <Trash2 style={{ width: 13, height: 13, color: '#EF4444' }} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSaved={fetchAll}
        />
      )}

      {selectedMember && (
        <ProfileDrawer
          member={selectedMember}
          tasks={tasks}
          meetings={meetings}
          activities={activities}
          onClose={() => setSelectedMember(null)}
          onEdit={() => { setEditUser(selectedMember); setShowModal(true); setSelectedMember(null); }}
          canEdit={currentUser?.role === 'admin'}
        />
      )}
    </AppLayout>
  );
}
