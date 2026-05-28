'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { IUser } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { Plus, X, Loader2, Edit2, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

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
      const url = isEdit ? `/api/users/${user!._id}` : '/api/users';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit ? { name: form.name, role: form.role, department: form.department, phone: form.phone } : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
                  <option value="admin">Admin</option>
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

export default function TeamPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<IUser | null>(null);
  const { user: currentUser, loading: authLoading } = useAuth();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!authLoading && currentUser) fetchUsers(); }, [authLoading, currentUser]);

  const deleteUser = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    toast.success('Member removed');
    fetchUsers();
  };

  const DEPT_COLORS: Record<string, string> = {
    Engineering: '#6366F1', Design: '#EC4899', Marketing: '#F59E0B',
    Product: '#10B981', Sales: '#3B82F6',
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
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Members', value: users.length },
            { label: 'Admins', value: users.filter(u => u.role === 'admin').length },
            { label: 'Departments', value: new Set(users.map(u => u.department).filter(Boolean)).size },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
            <p style={{ fontWeight: 500, color: 'var(--text)' }}>No team members yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map(member => {
              const deptColor = DEPT_COLORS[member.department || ''] || '#6B7280';
              return (
                <div key={member._id} className="card card-hover" style={{ padding: '20px' }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className="avatar avatar-lg"
                      style={{ background: deptColor }}
                    >
                      {getInitials(member.name)}
                    </div>
                    {currentUser?.role === 'admin' && (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-icon-sm"
                          onClick={() => { setEditUser(member); setShowModal(true); }}
                        >
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>
                        {member._id !== currentUser._id && (
                          <button className="btn btn-ghost btn-icon-sm" onClick={() => deleteUser(member._id)}>
                            <Trash2 style={{ width: 13, height: 13, color: '#EF4444' }} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: '0 0 2px' }}>{member.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>{member.email}</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="badge"
                      style={{
                        background: member.role === 'admin' ? '#EEF2FF' : '#F3F4F6',
                        color: member.role === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: 11,
                      }}
                    >
                      {member.role}
                    </span>
                    {member.department && (
                      <span
                        className="badge"
                        style={{ background: `${deptColor}15`, color: deptColor, fontSize: 11 }}
                      >
                        {member.department}
                      </span>
                    )}
                  </div>

                  {member.phone && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                      📱 {member.phone}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSaved={fetchUsers}
        />
      )}
    </AppLayout>
  );
}
