'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { IProject, IMilestone, ITask, IUser, MilestoneStatus, ProjectStatus } from '@/lib/types';
import { formatDate, getInitials, isOverdue } from '@/lib/utils';
import {
  ArrowLeft, Plus, X, CheckCircle2, Clock, AlertTriangle,
  Flag, Users, Calendar, Activity as ActivityIcon, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'overview' | 'milestones' | 'tasks' | 'activity';

const STATUS_CFG: Record<ProjectStatus, { label: string; bg: string; color: string }> = {
  planning:  { label: 'Planning',  bg: '#EEF2FF', color: '#6366F1' },
  active:    { label: 'Active',    bg: '#ECFDF5', color: '#10B981' },
  on_hold:   { label: 'On Hold',   bg: '#FFFBEB', color: '#F59E0B' },
  completed: { label: 'Completed', bg: '#F0FDF4', color: '#16A34A' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#EF4444' },
};

const MS_STATUS_CFG: Record<MilestoneStatus, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Not Started', bg: '#F3F4F6', color: '#6B7280' },
  in_progress: { label: 'In Progress', bg: '#EEF2FF', color: '#6366F1' },
  completed:   { label: 'Completed',   bg: '#ECFDF5', color: '#10B981' },
  delayed:     { label: 'Delayed',     bg: '#FFFBEB', color: '#F59E0B' },
};

const TASK_STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Not Started', bg: '#F3F4F6', color: '#6B7280' },
  in_progress: { label: 'In Progress', bg: '#EEF2FF', color: '#6366F1' },
  completed:   { label: 'Completed',   bg: '#ECFDF5', color: '#10B981' },
  blocked:     { label: 'Blocked',     bg: '#FEF2F2', color: '#EF4444' },
  delayed:     { label: 'Delayed',     bg: '#FFFBEB', color: '#F59E0B' },
};

const HEALTH_CFG: Record<string, { label: string; color: string; bg: string }> = {
  healthy:  { label: 'Healthy',  color: '#10B981', bg: '#ECFDF5' },
  at_risk:  { label: 'At Risk',  color: '#F59E0B', bg: '#FFFBEB' },
  delayed:  { label: 'Delayed',  color: '#EF4444', bg: '#FEF2F2' },
};

const EMPTY_MS_FORM = { name: '', description: '', status: 'not_started' as MilestoneStatus, startDate: '', endDate: '', owner: '' };
const EMPTY_TASK_FORM = { title: '', description: '', owner: '', priority: 'medium' as 'low' | 'medium' | 'high', endDate: '', milestoneId: '' };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMsModal, setShowMsModal] = useState(false);
  const [editMs, setEditMs] = useState<IMilestone | null>(null);
  const [msForm, setMsForm] = useState(EMPTY_MS_FORM);
  const [msSaving, setMsSaving] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [taskSaving, setTaskSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(apiUrl(`/api/projects/${id}`), { credentials: 'include' }),
        fetch(apiUrl('/api/users'), { credentials: 'include' }),
      ]);
      const [pData, uData] = await Promise.all([pRes.json(), uRes.json()]);
      if (pData.success) setData(pData.data);
      else { toast.error('Project not found'); router.push('/projects'); }
      if (uData.success) setAllUsers(uData.data);
    } catch { toast.error('Failed to load project'); } finally { setLoading(false); }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch(apiUrl(`/api/activities?entityType=project&limit=20`), { credentials: 'include' });
      const d = await res.json();
      if (d.success) setActivities(d.data.activities || []);
    } catch {}
  };

  useEffect(() => { fetchData(); fetchActivities(); }, [id]);

  const openNewMs = () => { setEditMs(null); setMsForm(EMPTY_MS_FORM); setShowMsModal(true); };
  const openEditMs = (ms: IMilestone) => {
    setEditMs(ms);
    setMsForm({
      name: ms.name,
      description: ms.description || '',
      status: ms.status,
      startDate: ms.startDate ? ms.startDate.slice(0, 10) : '',
      endDate: ms.endDate ? ms.endDate.slice(0, 10) : '',
      owner: (typeof ms.owner === 'object' ? ms.owner?._id : ms.owner) || '',
    });
    setShowMsModal(true);
  };

  const handleSaveMs = async () => {
    if (!msForm.name.trim()) { toast.error('Milestone name is required'); return; }
    setMsSaving(true);
    try {
      const url = editMs ? apiUrl(`/api/milestones/${editMs._id}`) : apiUrl('/api/milestones');
      const method = editMs ? 'PATCH' : 'POST';
      const body = editMs ? msForm : { ...msForm, projectId: id };
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) { toast.success(editMs ? 'Milestone updated' : 'Milestone created'); setShowMsModal(false); fetchData(); }
      else toast.error(d.message || 'Save failed');
    } catch { toast.error('Network error'); }
    setMsSaving(false);
  };

  const handleDeleteMs = async (msId: string, name: string) => {
    if (!confirm(`Delete milestone "${name}"?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/milestones/${msId}`), { method: 'DELETE', credentials: 'include' });
      const d = await res.json();
      if (d.success) { toast.success('Milestone deleted'); fetchData(); }
      else toast.error(d.message || 'Delete failed');
    } catch { toast.error('Network error'); }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) { toast.error('Task title is required'); return; }
    if (!taskForm.owner) { toast.error('Owner is required'); return; }
    setTaskSaving(true);
    try {
      // Step 1: create the task with projectId in the body
      const res = await fetch(apiUrl('/api/tasks'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description,
          owner: taskForm.owner,
          priority: taskForm.priority,
          endDate: taskForm.endDate || undefined,
          milestoneId: taskForm.milestoneId || undefined,
          projectId: id,
        }),
      });
      const d = await res.json();
      if (d.success) {
        // Step 2: patch projectId explicitly — ensures it's set even if server
        // createTask was running old code before hot-reload picked up taskService changes
        const taskId = d.data?._id;
        if (taskId) {
          await fetch(apiUrl(`/api/tasks/${taskId}`), {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: id }),
          });
        }
        toast.success('Task added to project');
        setShowTaskModal(false);
        setTaskForm(EMPTY_TASK_FORM);
        await fetchData();
      } else toast.error(d.message || 'Failed to create task');
    } catch { toast.error('Network error'); }
    setTaskSaving(false);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading project...</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  const { project, stats, milestones, tasks, health } = data as {
    project: IProject; stats: any; milestones: IMilestone[]; tasks: ITask[]; health: string;
  };

  // Always derive progress from actual task counts — never trust the stored field alone
  const liveProgress = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const healthCfg = HEALTH_CFG[health] || HEALTH_CFG.healthy;
  const projectStatusCfg = STATUS_CFG[project.status];

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'milestones', label: `Milestones (${milestones.length})`, icon: Flag },
    { key: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckCircle2 },
    { key: 'activity', label: 'Activity', icon: ActivityIcon },
  ];

  return (
    <AppLayout>
      {/* Page header */}
      <div className="header" style={{ flexDirection: 'column', height: 'auto', padding: '16px 24px', alignItems: 'flex-start', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/projects')} style={{ gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Projects
        </button>
        <div className="flex items-center gap-3 flex-wrap" style={{ width: '100%' }}>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{project.name}</h1>
              <span className="badge" style={{ background: projectStatusCfg.bg, color: projectStatusCfg.color, fontSize: 12 }}>
                {projectStatusCfg.label}
              </span>
              <span className="badge" style={{ background: healthCfg.bg, color: healthCfg.color, fontSize: 12 }}>
                {healthCfg.label}
              </span>
            </div>
            {project.description && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {project.startDate && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 13, height: 13 }} /> {formatDate(project.startDate)}
              </span>
            )}
            {project.endDate && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {formatDate(project.endDate)}</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                fontWeight: tab === t.key ? 600 : 400,
                background: tab === t.key ? 'var(--primary-light)' : 'transparent',
                color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none',
              }}>
              <t.icon style={{ width: 14, height: 14 }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content flex-1">

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
              {[
                { label: 'Total Tasks', value: stats.totalTasks, icon: CheckCircle2, color: '#6366F1', bg: '#EEF2FF' },
                { label: 'Open Tasks', value: stats.openTasks, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Completed', value: stats.completedTasks, icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
                { label: 'Overdue', value: stats.overdueTasks, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
                { label: 'Milestones', value: stats.totalMilestones, icon: Flag, color: '#8B5CF6', bg: '#F5F3FF' },
              ].map(card => (
                <div key={card.label} className="stat-card">
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</p>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <card.icon style={{ width: 13, height: 13, color: card.color }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Overall Progress</h3>
                <span style={{ fontSize: 18, fontWeight: 700, color: liveProgress >= 80 ? '#10B981' : 'var(--primary)' }}>
                  {liveProgress}%
                </span>
              </div>
              <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5 }}>
                <div style={{
                  height: '100%', borderRadius: 5, transition: 'width 0.5s',
                  width: `${liveProgress}%`,
                  background: liveProgress >= 80 ? '#10B981' : liveProgress >= 50 ? '#6366F1' : '#F59E0B',
                }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Team members */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Users style={{ width: 15, height: 15, color: 'var(--text-muted)' }} /> Team Members
                </h3>
                {project.teamMembers.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No team members assigned</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {project.teamMembers.map(m => {
                      const member = typeof m === 'object' ? m : null;
                      if (!member) return null;
                      return (
                        <div key={member._id} className="flex items-center gap-2.5">
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: 10, background: 'var(--primary)' }}>
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{member.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{member.role}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming milestones */}
              <div className="card" style={{ padding: '18px 20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Flag style={{ width: 15, height: 15, color: 'var(--text-muted)' }} /> Upcoming Milestones
                </h3>
                {data.upcomingMilestones.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming milestones</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.upcomingMilestones.map((ms: IMilestone) => {
                      const msCfg = MS_STATUS_CFG[ms.status];
                      return (
                        <div key={ms._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{ms.name}</p>
                            {ms.endDate && (
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Due {formatDate(ms.endDate)}</p>
                            )}
                          </div>
                          <span className="badge" style={{ background: msCfg.bg, color: msCfg.color, fontSize: 11 }}>
                            {msCfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MILESTONES TAB */}
        {tab === 'milestones' && (
          <div>
            {canEdit && (
              <div className="flex justify-end mb-4">
                <button className="btn btn-primary btn-sm" onClick={openNewMs}>
                  <Plus style={{ width: 14, height: 14 }} /> New Milestone
                </button>
              </div>
            )}
            {milestones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Flag style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
                <p style={{ fontWeight: 500, color: 'var(--text)' }}>No milestones yet</p>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openNewMs}>
                    <Plus style={{ width: 14, height: 14 }} /> Add Milestone
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Milestone</th>
                      <th style={{ minWidth: 100 }}>Status</th>
                      <th style={{ minWidth: 120 }}>Progress</th>
                      <th style={{ minWidth: 120 }}>Owner</th>
                      <th style={{ minWidth: 110 }}>Start Date</th>
                      <th style={{ minWidth: 110 }}>End Date</th>
                      <th style={{ minWidth: 80 }}>Tasks</th>
                      {canEdit && <th style={{ minWidth: 80, textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((ms: any) => {
                      const msCfg = MS_STATUS_CFG[ms.status as MilestoneStatus];
                      const owner = typeof ms.owner === 'object' ? ms.owner : null;
                      return (
                        <tr key={ms._id}>
                          <td>
                            <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{ms.name}</p>
                            {ms.description && (
                              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{ms.description}</p>
                            )}
                          </td>
                          <td>
                            <span className="badge" style={{ background: msCfg.bg, color: msCfg.color, fontSize: 12 }}>
                              {msCfg.label}
                            </span>
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
                            {owner ? (
                              <div className="flex items-center gap-1.5">
                                <div className="avatar" style={{ width: 22, height: 22, fontSize: 8, background: 'var(--primary)' }}>
                                  {getInitials(owner.name)}
                                </div>
                                <span style={{ fontSize: 13 }}>{owner.name.split(' ')[0]}</span>
                              </div>
                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                          </td>
                          <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ms.startDate ? formatDate(ms.startDate) : '—'}</span></td>
                          <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ms.endDate ? formatDate(ms.endDate) : '—'}</span></td>
                          <td>
                            <span style={{ fontSize: 13 }}>
                              {ms.completedTaskCount ?? 0}/{ms.taskCount ?? 0}
                            </span>
                          </td>
                          {canEdit && (
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                <button className="btn btn-ghost btn-icon-sm" onClick={() => openEditMs(ms)}>
                                  <span style={{ fontSize: 12 }}>Edit</span>
                                </button>
                                <button className="btn btn-ghost btn-icon-sm" style={{ color: '#EF4444' }}
                                  onClick={() => handleDeleteMs(ms._id, ms.name)}>
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
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <div>
            {canEdit && (
              <div className="flex justify-end mb-4">
                <button className="btn btn-primary btn-sm"
                  onClick={() => { setTaskForm(EMPTY_TASK_FORM); setShowTaskModal(true); }}>
                  <Plus style={{ width: 14, height: 14 }} /> New Task
                </button>
              </div>
            )}
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><CheckCircle2 style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
                <p style={{ fontWeight: 500, color: 'var(--text)' }}>No tasks yet</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Create a task and it will be linked to this project automatically</p>
                {canEdit && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}
                    onClick={() => { setTaskForm(EMPTY_TASK_FORM); setShowTaskModal(true); }}>
                    <Plus style={{ width: 14, height: 14 }} /> Add Task
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 240 }}>Task</th>
                      <th style={{ minWidth: 130 }}>Owner</th>
                      <th style={{ minWidth: 110 }}>Status</th>
                      <th style={{ minWidth: 100 }}>Priority</th>
                      <th style={{ minWidth: 110 }}>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task: ITask) => {
                      const owner = typeof task.owner === 'object' ? task.owner : null;
                      const tCfg = TASK_STATUS_CFG[task.status];
                      const late = task.endDate ? isOverdue(task.endDate, task.status) : false;
                      return (
                        <tr key={task._id}>
                          <td>
                            <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{task.title}</p>
                            {task.description && (
                              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }} className="truncate-2">{task.description}</p>
                            )}
                          </td>
                          <td>
                            {owner ? (
                              <div className="flex items-center gap-1.5">
                                <div className="avatar" style={{ width: 22, height: 22, fontSize: 8, background: 'var(--primary)' }}>
                                  {getInitials(owner.name)}
                                </div>
                                <span style={{ fontSize: 13 }}>{owner.name.split(' ')[0]}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td>
                            <span className="badge" style={{ background: tCfg.bg, color: tCfg.color, fontSize: 12 }}>
                              {tCfg.label}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 13, fontWeight: 500, textTransform: 'capitalize',
                              color: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#6B7280',
                            }}>
                              {task.priority}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: late ? '#EF4444' : 'var(--text-muted)', fontWeight: late ? 600 : 400 }}>
                              {task.endDate ? formatDate(task.endDate) : '—'}
                              {late && <span style={{ marginLeft: 4, fontSize: 11 }}>· Overdue</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', background: '#FAFAFA' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''} linked to this project
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><ActivityIcon style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
                <p style={{ fontWeight: 500, color: 'var(--text)' }}>No activity yet</p>
              </div>
            ) : (
              activities.map((act: any) => (
                <div key={act._id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 9, background: 'var(--primary)', flexShrink: 0 }}>
                    {getInitials(act.user?.name || '?')}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>
                      <strong>{act.user?.name}</strong> {act.action}
                      {act.entityTitle && <span style={{ color: 'var(--text-muted)' }}> — {act.entityTitle}</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {new Date(act.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>New Task</h2>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setShowTaskModal(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Task Title *</label>
                <input className="input" placeholder="e.g. Set up CI/CD pipeline"
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Optional details"
                  value={taskForm.description}
                  onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Owner *</label>
                  <select className="input" value={taskForm.owner}
                    onChange={e => setTaskForm(f => ({ ...f, owner: e.target.value }))}>
                    <option value="">Select owner</option>
                    {allUsers.filter(u => u.role !== 'client').map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={taskForm.priority}
                    onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as 'low' | 'medium' | 'high' }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={taskForm.endDate}
                    onChange={e => setTaskForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Milestone</label>
                  <select className="input" value={taskForm.milestoneId}
                    onChange={e => setTaskForm(f => ({ ...f, milestoneId: e.target.value }))}>
                    <option value="">No milestone</option>
                    {milestones.map((ms: IMilestone) => (
                      <option key={ms._id} value={ms._id}>{ms.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTask} disabled={taskSaving}>
                {taskSaving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showMsModal && (
        <div className="modal-overlay" onClick={() => setShowMsModal(false)}>
          <div className="modal" style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {editMs ? 'Edit Milestone' : 'New Milestone'}
              </h2>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setShowMsModal(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Milestone Name *</label>
                <input className="input" placeholder="e.g. Infrastructure Setup"
                  value={msForm.name} onChange={e => setMsForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={msForm.description}
                  onChange={e => setMsForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={msForm.status}
                    onChange={e => setMsForm(f => ({ ...f, status: e.target.value as MilestoneStatus }))}>
                    {Object.entries(MS_STATUS_CFG).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Owner</label>
                  <select className="input" value={msForm.owner}
                    onChange={e => setMsForm(f => ({ ...f, owner: e.target.value }))}>
                    <option value="">No owner</option>
                    {allUsers.filter(u => u.role !== 'client').map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={msForm.startDate}
                    onChange={e => setMsForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input" value={msForm.endDate}
                    onChange={e => setMsForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowMsModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveMs} disabled={msSaving}>
                {msSaving ? 'Saving...' : editMs ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
