'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { IMilestone, IProject, IUser, MilestoneStatus } from '@/lib/types';
import { formatDate, getInitials } from '@/lib/utils';
import { Flag, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_CFG: Record<MilestoneStatus, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Not Started', bg: '#F3F4F6', color: '#6B7280' },
  in_progress: { label: 'In Progress', bg: '#EEF2FF', color: '#6366F1' },
  completed:   { label: 'Completed',   bg: '#ECFDF5', color: '#10B981' },
  delayed:     { label: 'Delayed',     bg: '#FFFBEB', color: '#F59E0B' },
};

const EMPTY_FORM = {
  name: '', description: '', projectId: '', status: 'not_started' as MilestoneStatus,
  startDate: '', endDate: '', owner: '',
};

export default function MilestonesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [milestones, setMilestones] = useState<IMilestone[]>([]);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | 'all'>('all');
  const [filterProject, setFilterProject] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editMs, setEditMs] = useState<IMilestone | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchMilestones = async () => {
    try {
      const res = await fetch(apiUrl('/api/milestones'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMilestones(data.data);
    } catch { toast.error('Failed to load milestones'); }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      try {
        const [mRes, pRes, uRes] = await Promise.all([
          fetch(apiUrl('/api/milestones'), { credentials: 'include' }),
          fetch(apiUrl('/api/projects'), { credentials: 'include' }),
          fetch(apiUrl('/api/users'), { credentials: 'include' }),
        ]);
        const [mData, pData, uData] = await Promise.all([mRes.json(), pRes.json(), uRes.json()]);
        if (mData.success) setMilestones(mData.data);
        if (pData.success) setProjects(pData.data);
        if (uData.success) setUsers(uData.data);
      } finally { setLoading(false); }
    };
    init();
  }, [authLoading, user]);

  const openNew = () => { setEditMs(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (ms: IMilestone) => {
    setEditMs(ms);
    setForm({
      name: ms.name,
      description: ms.description || '',
      projectId: (typeof ms.projectId === 'object' ? ms.projectId._id : ms.projectId) || '',
      status: ms.status,
      startDate: ms.startDate ? ms.startDate.slice(0, 10) : '',
      endDate: ms.endDate ? ms.endDate.slice(0, 10) : '',
      owner: (typeof ms.owner === 'object' ? ms.owner?._id : ms.owner) || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Milestone name is required'); return; }
    if (!form.projectId) { toast.error('Project is required'); return; }
    setSaving(true);
    try {
      const url = editMs ? apiUrl(`/api/milestones/${editMs._id}`) : apiUrl('/api/milestones');
      const method = editMs ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editMs ? 'Milestone updated' : 'Milestone created');
        setShowModal(false);
        fetchMilestones();
      } else toast.error(data.message || 'Save failed');
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete milestone "${name}"?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/milestones/${id}`), { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { toast.success('Milestone deleted'); fetchMilestones(); }
      else toast.error(data.message || 'Delete failed');
    } catch { toast.error('Network error'); }
  };

  const filtered = useMemo(() => {
    let arr = milestones;
    if (filterStatus !== 'all') arr = arr.filter(m => m.status === filterStatus);
    if (filterProject !== 'all') arr = arr.filter(m => {
      const pid = typeof m.projectId === 'object' ? m.projectId._id : m.projectId;
      return pid === filterProject;
    });
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(m => {
        const projName = typeof m.projectId === 'object' ? m.projectId.name : '';
        return m.name.toLowerCase().includes(q) || projName.toLowerCase().includes(q);
      });
    }
    return arr;
  }, [milestones, filterStatus, filterProject, search]);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const teamUsers = users.filter(u => u.role !== 'client');

  return (
    <AppLayout>
      <Header
        title="Milestones"
        searchPlaceholder="Search milestones..."
        onSearch={setSearch}
      />

      <div className="page-content flex-1">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {filtered.length} milestone{filtered.length !== 1 ? 's' : ''}
          </span>
          <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="input input-sm" style={{ width: 'auto', minWidth: 140 }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="input input-sm" style={{ width: 'auto', minWidth: 150 }}>
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          {(filterStatus !== 'all' || filterProject !== 'all') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus('all'); setFilterProject('all'); }} style={{ fontSize: 12 }}>
              Clear
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginLeft: 'auto' }}>
              <Plus style={{ width: 14, height: 14 }} /> New Milestone
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading milestones...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Flag style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
              <p style={{ fontWeight: 500, color: 'var(--text)' }}>No milestones found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {milestones.length === 0 ? 'Create milestones inside a project to track progress' : 'Try different filters'}
              </p>
              {canEdit && milestones.length === 0 && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openNew}>
                  <Plus style={{ width: 14, height: 14 }} /> New Milestone
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Milestone</th>
                  <th style={{ minWidth: 160 }}>Project</th>
                  <th style={{ minWidth: 120 }}>Owner</th>
                  <th style={{ minWidth: 120 }}>Progress</th>
                  <th style={{ minWidth: 110 }}>Status</th>
                  <th style={{ minWidth: 110 }}>Start Date</th>
                  <th style={{ minWidth: 110 }}>End Date</th>
                  <th style={{ minWidth: 80 }}>Tasks</th>
                  {canEdit && <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ms => {
                  const cfg = STATUS_CFG[ms.status];
                  const owner = typeof ms.owner === 'object' ? ms.owner : null;
                  const project = typeof ms.projectId === 'object' ? ms.projectId : null;
                  return (
                    <tr key={ms._id}>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{ms.name}</p>
                        {ms.description && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{ms.description}</p>
                        )}
                      </td>
                      <td>
                        {project ? (
                          <button
                            onClick={() => router.push(`/projects/${typeof ms.projectId === 'object' ? ms.projectId._id : ms.projectId}`)}
                            style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {project.name}
                          </button>
                        ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        {owner ? (
                          <div className="flex items-center gap-1.5">
                            <div className="avatar" style={{ width: 22, height: 22, fontSize: 8, background: 'var(--primary)' }}>
                              {getInitials(owner.name)}
                            </div>
                            <span style={{ fontSize: 13 }}>{owner.name.split(' ')[0]}</span>
                          </div>
                        ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, minWidth: 60 }}>
                            <div style={{
                              width: `${ms.progress}%`, height: '100%', borderRadius: 3,
                              background: ms.progress === 100 ? '#10B981' : '#6366F1',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{ms.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 12 }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ms.startDate ? formatDate(ms.startDate) : '—'}</span></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ms.endDate ? formatDate(ms.endDate) : '—'}</span></td>
                      <td>
                        <span style={{ fontSize: 13 }}>{ms.completedTaskCount ?? 0}/{ms.taskCount ?? 0}</span>
                      </td>
                      {canEdit && (
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button className="btn btn-ghost btn-icon-sm" onClick={() => openEdit(ms)}>
                              <span style={{ fontSize: 12 }}>Edit</span>
                            </button>
                            <button className="btn btn-ghost btn-icon-sm" style={{ color: '#EF4444' }}
                              onClick={() => handleDelete(ms._id, ms.name)}>
                              <X style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {filtered.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', background: '#FAFAFA' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {filtered.length} milestone{filtered.length !== 1 ? 's' : ''} · Progress auto-calculated from linked tasks
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Milestone Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {editMs ? 'Edit Milestone' : 'New Milestone'}
              </h2>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setShowModal(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Milestone Name *</label>
                <input className="input" placeholder="e.g. Database Migration"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Project *</label>
                <select className="input" value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                  <option value="">Select a project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as MilestoneStatus }))}>
                    {Object.entries(STATUS_CFG).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Owner</label>
                  <select className="input" value={form.owner}
                    onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}>
                    <option value="">No owner</option>
                    {teamUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editMs ? 'Update Milestone' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
