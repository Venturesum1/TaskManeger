'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { IProject, IUser, ProjectStatus } from '@/lib/types';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, FolderKanban, X, Calendar, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_CFG: Record<ProjectStatus, { label: string; bg: string; color: string }> = {
  planning:  { label: 'Planning',   bg: '#EEF2FF', color: '#6366F1' },
  active:    { label: 'Active',     bg: '#ECFDF5', color: '#10B981' },
  on_hold:   { label: 'On Hold',    bg: '#FFFBEB', color: '#F59E0B' },
  completed: { label: 'Completed',  bg: '#F0FDF4', color: '#16A34A' },
  cancelled: { label: 'Cancelled',  bg: '#FEF2F2', color: '#EF4444' },
};

const HEALTH_CFG: Record<string, { label: string; color: string }> = {
  healthy:  { label: 'Healthy',  color: '#10B981' },
  at_risk:  { label: 'At Risk',  color: '#F59E0B' },
  delayed:  { label: 'Delayed',  color: '#EF4444' },
};

const EMPTY_FORM = {
  name: '', description: '', status: 'planning' as ProjectStatus,
  startDate: '', endDate: '', teamMembers: [] as string[], clientId: '',
};

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<IProject | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch(apiUrl('/api/projects'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch { toast.error('Failed to load projects'); }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      try {
        const [pRes, uRes] = await Promise.all([
          fetch(apiUrl('/api/projects'), { credentials: 'include' }),
          fetch(apiUrl('/api/users'), { credentials: 'include' }),
        ]);
        const [pData, uData] = await Promise.all([pRes.json(), uRes.json()]);
        if (pData.success) setProjects(pData.data);
        if (uData.success) setUsers(uData.data);
      } finally { setLoading(false); }
    };
    init();
  }, [authLoading, user]);

  const openNew = () => { setEditProject(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (p: IProject) => {
    setEditProject(p);
    setForm({
      name: p.name,
      description: p.description || '',
      status: p.status,
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      teamMembers: p.teamMembers.map(m => (typeof m === 'object' ? m._id : m)),
      clientId: (typeof p.clientId === 'object' ? p.clientId?._id : p.clientId) || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setSaving(true);
    try {
      const body = { ...form, clientId: form.clientId || undefined };
      const url = editProject ? apiUrl(`/api/projects/${editProject._id}`) : apiUrl('/api/projects');
      const method = editProject ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editProject ? 'Project updated' : 'Project created');
        setShowModal(false);
        fetchProjects();
      } else { toast.error(data.message || 'Save failed'); }
    } catch { toast.error('Network error'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(apiUrl(`/api/projects/${id}`), { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { toast.success('Project deleted'); fetchProjects(); }
      else toast.error(data.message || 'Delete failed');
    } catch { toast.error('Network error'); }
  };

  const filtered = useMemo(() => {
    let arr = projects;
    if (filterStatus !== 'all') arr = arr.filter(p => p.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    return arr;
  }, [projects, filterStatus, search]);

  const clients = users.filter(u => u.role === 'client');
  const teamUsers = users.filter(u => u.role !== 'client');
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  return (
    <AppLayout>
      <Header
        title="Projects"
        searchPlaceholder="Search projects..."
        onSearch={setSearch}
        {...(canEdit ? { onNewTask: openNew } : {})}
      />

      <div className="page-content flex-1">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
          <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="input input-sm"
            style={{ width: 'auto', minWidth: 140 }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CFG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
          {filterStatus !== 'all' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilterStatus('all')} style={{ fontSize: 12 }}>
              Clear
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginLeft: 'auto' }}>
              <Plus style={{ width: 14, height: 14 }} /> New Project
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading projects...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FolderKanban style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
              <p style={{ fontWeight: 500, color: 'var(--text)' }}>No projects found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {projects.length === 0 ? 'Create your first project to get started' : 'Try different filters'}
              </p>
              {canEdit && projects.length === 0 && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openNew}>
                  <Plus style={{ width: 14, height: 14 }} /> New Project
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Project Name</th>
                  <th style={{ minWidth: 120 }}>Client</th>
                  <th style={{ minWidth: 110 }}>Status</th>
                  <th style={{ minWidth: 120 }}>Progress</th>
                  <th style={{ minWidth: 120 }}>Team</th>
                  <th style={{ minWidth: 110 }}>Start Date</th>
                  <th style={{ minWidth: 110 }}>End Date</th>
                  <th style={{ minWidth: 80 }}>Tasks</th>
                  <th style={{ minWidth: 90 }}>Milestones</th>
                  {canEdit && <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(project => {
                  const cfg = STATUS_CFG[project.status];
                  const client = typeof project.clientId === 'object' ? project.clientId : null;
                  return (
                    <tr key={project._id} style={{ cursor: 'pointer' }}>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--primary)', margin: 0, fontSize: 14 }}>
                            {project.name}
                          </p>
                          {project.description && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }} className="truncate-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {client ? client.name : '—'}
                        </span>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 12 }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, minWidth: 60 }}>
                            <div style={{
                              width: `${project.progress}%`, height: '100%', borderRadius: 3,
                              background: project.progress >= 80 ? '#10B981' : project.progress >= 50 ? '#6366F1' : '#F59E0B',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>
                            {project.progress}%
                          </span>
                        </div>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <div className="flex items-center gap-1">
                          {project.teamMembers.slice(0, 3).map(m => {
                            const member = typeof m === 'object' ? m : null;
                            return member ? (
                              <div key={member._id} title={member.name}
                                className="avatar" style={{ width: 24, height: 24, fontSize: 9, background: 'var(--primary)', flexShrink: 0 }}>
                                {getInitials(member.name)}
                              </div>
                            ) : null;
                          })}
                          {project.teamMembers.length > 3 && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              +{project.teamMembers.length - 3}
                            </span>
                          )}
                          {project.teamMembers.length === 0 && (
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {project.startDate ? formatDate(project.startDate) : '—'}
                        </span>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {project.endDate ? formatDate(project.endDate) : '—'}
                        </span>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{project.taskCount ?? 0}</span>
                      </td>
                      <td onClick={() => router.push(`/projects/${project._id}`)}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{project.milestoneCount ?? 0}</span>
                      </td>
                      {canEdit && (
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button className="btn btn-ghost btn-icon-sm" title="Edit"
                              onClick={e => { e.stopPropagation(); openEdit(project); }}>
                              <span style={{ fontSize: 12 }}>Edit</span>
                            </button>
                            <button className="btn btn-ghost btn-icon-sm" title="Delete"
                              onClick={e => { e.stopPropagation(); handleDelete(project._id, project.name); }}
                              style={{ color: '#EF4444' }}>
                              <X style={{ width: 14, height: 14 }} />
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
                {filtered.length} project{filtered.length !== 1 ? 's' : ''} · Click a row to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {editProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setShowModal(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Project Name *</label>
                <input className="input" placeholder="e.g. AWS Migration"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Brief project description"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
                    {Object.entries(STATUS_CFG).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Client</label>
                  <select className="input" value={form.clientId}
                    onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
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
              <div>
                <label className="label">Team Members</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, minHeight: 40, background: '#fff' }}>
                  {teamUsers.map(u => {
                    const selected = form.teamMembers.includes(u._id);
                    return (
                      <button key={u._id} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          teamMembers: selected
                            ? f.teamMembers.filter(id => id !== u._id)
                            : [...f.teamMembers, u._id],
                        }))}
                        style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                          fontWeight: selected ? 600 : 400,
                          border: selected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                          background: selected ? 'var(--primary-light)' : '#fff',
                          color: selected ? 'var(--primary)' : 'var(--text-muted)',
                        }}>
                        {u.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
