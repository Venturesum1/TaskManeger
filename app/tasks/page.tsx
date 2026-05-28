'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import TaskModal from '@/components/tasks/TaskModal';
import { StatusBadge, PriorityBadge } from '@/components/tasks/StatusBadge';
import { ITask, IUser, TaskStatus, TaskPriority } from '@/lib/types';
import {
  formatDate, getDaysRemaining, isOverdue,
  getInitials, buildWhatsAppLink, STATUS_LABELS,
} from '@/lib/utils';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Plus, Filter,
  MessageCircle, Mail, Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

type SortField = 'title' | 'status' | 'priority' | 'endDate' | 'owner';

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<ITask | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('endDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch(apiUrl('/api/tasks'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch { toast.error('Failed to load tasks'); }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      try {
        const [tRes, uRes] = await Promise.all([
          fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
          fetch(apiUrl('/api/users'), { credentials: 'include' }),
        ]);
        const [tData, uData] = await Promise.all([tRes.json(), uRes.json()]);
        if (tData.success) setTasks(tData.data);
        if (uData.success) setUsers(uData.data);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [authLoading, user]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown style={{ width: 12, height: 12, opacity: 0.35 }} />;
    return sortDir === 'asc'
      ? <ArrowUp style={{ width: 12, height: 12, color: 'var(--primary)' }} />
      : <ArrowDown style={{ width: 12, height: 12, color: 'var(--primary)' }} />;
  };

  const filtered = useMemo(() => {
    let arr = tasks;
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (typeof t.owner === 'object' && t.owner.name.toLowerCase().includes(q)) ||
        (t.milestone || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') arr = arr.filter(t => t.status === filterStatus);
    if (filterPriority !== 'all') arr = arr.filter(t => t.priority === filterPriority);

    return [...arr].sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortField === 'title') { av = a.title; bv = b.title; }
      else if (sortField === 'status') { av = a.status; bv = b.status; }
      else if (sortField === 'priority') {
        const o = { high: 3, medium: 2, low: 1 };
        av = o[a.priority]; bv = o[b.priority];
      }
      else if (sortField === 'endDate') {
        av = a.endDate ? new Date(a.endDate).getTime() : 0;
        bv = b.endDate ? new Date(b.endDate).getTime() : 0;
      }
      else if (sortField === 'owner') {
        av = typeof a.owner === 'object' ? a.owner.name : '';
        bv = typeof b.owner === 'object' ? b.owner.name : '';
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, search, filterStatus, filterPriority, sortField, sortDir]);

  const patchTask = async (id: string, updates: Partial<ITask>) => {
    try {
      const res = await fetch(apiUrl(`/api/tasks/${id}`), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.map(t => t._id === id ? data.data : t));
      }
    } catch { toast.error('Update failed'); }
    setInlineEdit(null);
  };

  const sendWhatsApp = (task: ITask) => {
    const owner = typeof task.owner === 'object' ? task.owner : null;
    if (!owner?.phone) { toast.error('Owner has no phone number'); return; }
    const msg = `Hi ${owner.name},\n\nReminder: Your task "${task.title}" is${task.endDate ? ` due on ${formatDate(task.endDate)}` : ' overdue'}.\nStatus: ${STATUS_LABELS[task.status]}\n\nPlease update your progress.\n— B4Utaskmanagement`;
    window.open(buildWhatsAppLink(owner.phone, msg), '_blank');
  };

  const sendEmail = async (task: ITask) => {
    const owner = typeof task.owner === 'object' ? task.owner : null;
    if (!owner?.email) { toast.error('Owner has no email address'); return; }
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_due',
          to: owner.email,
          subject: `Task Reminder: ${task.title}`,
          data: { taskTitle: task.title, ownerName: owner.name, dueDate: task.endDate ? formatDate(task.endDate) : 'N/A' },
        }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Email sent to ${owner.name}`);
      else toast.error(data.error || 'Email failed');
    } catch (e: any) { toast.error(e.message || 'Network error'); }
  };

  return (
    <AppLayout>
      <Header
        title="Tasks"
        searchPlaceholder="Search tasks..."
        onSearch={setSearch}
        onNewTask={() => { setEditTask(null); setShowModal(true); }}
      />

      <div className="page-content flex-1">
        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {filtered.length} tasks
          </span>
          <div style={{ height: 16, width: 1, background: 'var(--border)' }} />

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="input input-sm"
              style={{ width: 'auto', paddingRight: 28, minWidth: 130 }}
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
            className="input input-sm"
            style={{ width: 'auto', paddingRight: 28, minWidth: 120 }}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {(filterStatus !== 'all' || filterPriority !== 'all' || search) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setSearch(''); }}
              style={{ fontSize: 12 }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading tasks...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Filter style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
              </div>
              <p style={{ fontWeight: 500, color: 'var(--text)' }}>No tasks found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {tasks.length === 0 ? 'Create your first task' : 'Try different filters'}
              </p>
              {tasks.length === 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={() => { setEditTask(null); setShowModal(true); }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  New Task
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 24, padding: '10px 8px 10px 16px' }}>
                    <input type="checkbox" style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </th>
                  <th onClick={() => toggleSort('title')} style={{ minWidth: 260 }}>
                    <span className="flex items-center gap-1.5">Task Name <SortIcon field="title" /></span>
                  </th>
                  <th onClick={() => toggleSort('owner')} style={{ minWidth: 140 }}>
                    <span className="flex items-center gap-1.5">Owner <SortIcon field="owner" /></span>
                  </th>
                  <th onClick={() => toggleSort('priority')} style={{ minWidth: 100 }}>
                    <span className="flex items-center gap-1.5">Priority <SortIcon field="priority" /></span>
                  </th>
                  <th onClick={() => toggleSort('status')} style={{ minWidth: 140 }}>
                    <span className="flex items-center gap-1.5">Status <SortIcon field="status" /></span>
                  </th>
                  <th style={{ minWidth: 120 }}>Start Date</th>
                  <th onClick={() => toggleSort('endDate')} style={{ minWidth: 120 }}>
                    <span className="flex items-center gap-1.5">End Date <SortIcon field="endDate" /></span>
                  </th>
                  <th style={{ minWidth: 120 }}>Milestone</th>
                  <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => {
                  const owner = typeof task.owner === 'object' ? task.owner : null;
                  const daysLeft = task.endDate ? getDaysRemaining(task.endDate) : null;
                  const late = task.endDate ? isOverdue(task.endDate, task.status) : false;
                  const urgent = !late && daysLeft !== null && daysLeft <= 2 && task.status !== 'completed';

                  return (
                    <tr key={task._id}>
                      {/* Checkbox */}
                      <td style={{ padding: '12px 8px 12px 16px' }}>
                        <input type="checkbox" style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
                      </td>

                      {/* Title */}
                      <td>
                        <div>
                          <p
                            style={{ fontWeight: 500, color: 'var(--text)', margin: 0, cursor: 'pointer' }}
                            onClick={() => { setEditTask(task); setShowModal(true); }}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 1 }}
                              className="truncate-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Owner */}
                      <td>
                        {owner ? (
                          <div className="flex items-center gap-2">
                            <div className="avatar avatar-sm" style={{ background: 'var(--primary)', fontSize: 9 }}>
                              {getInitials(owner.name)}
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{owner.name.split(' ')[0]}</span>
                          </div>
                        ) : '—'}
                      </td>

                      {/* Priority — inline edit */}
                      <td>
                        {inlineEdit?.id === task._id && inlineEdit?.field === 'priority' ? (
                          <select
                            autoFocus
                            defaultValue={task.priority}
                            className="input input-sm"
                            style={{ width: 110 }}
                            onChange={e => patchTask(task._id, { priority: e.target.value as TaskPriority })}
                            onBlur={() => setInlineEdit(null)}
                          >
                            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        ) : (
                          <span
                            className="cursor-pointer"
                            onClick={() => setInlineEdit({ id: task._id, field: 'priority' })}
                          >
                            <PriorityBadge priority={task.priority} />
                          </span>
                        )}
                      </td>

                      {/* Status — inline edit */}
                      <td>
                        {inlineEdit?.id === task._id && inlineEdit?.field === 'status' ? (
                          <select
                            autoFocus
                            defaultValue={task.status}
                            className="input input-sm"
                            style={{ width: 140 }}
                            onChange={e => patchTask(task._id, { status: e.target.value as TaskStatus })}
                            onBlur={() => setInlineEdit(null)}
                          >
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        ) : (
                          <span
                            className="cursor-pointer"
                            onClick={() => setInlineEdit({ id: task._id, field: 'status' })}
                          >
                            <StatusBadge status={task.status} />
                          </span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {task.startDate ? formatDate(task.startDate) : '—'}
                        </span>
                      </td>

                      {/* End Date */}
                      <td>
                        <span style={{
                          fontSize: 13,
                          fontWeight: late || urgent ? 600 : 400,
                          color: late ? '#EF4444' : urgent ? '#F59E0B' : 'var(--text-muted)',
                        }}>
                          {task.endDate ? formatDate(task.endDate) : '—'}
                          {late && <span style={{ marginLeft: 4, fontSize: 11 }}>· Overdue</span>}
                          {urgent && !late && <span style={{ marginLeft: 4, fontSize: 11 }}>· Soon</span>}
                        </span>
                      </td>

                      {/* Milestone */}
                      <td>
                        {task.milestone ? (
                          <span
                            className="badge"
                            style={{ background: '#EEF2FF', color: 'var(--primary)', fontSize: 11 }}
                          >
                            {task.milestone}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="btn btn-ghost btn-icon-sm"
                            title="Edit"
                            onClick={() => { setEditTask(task); setShowModal(true); }}
                          >
                            <Edit2 style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon-sm"
                            title="WhatsApp Reminder"
                            onClick={() => sendWhatsApp(task)}
                          >
                            <MessageCircle style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon-sm"
                            title="Email Reminder"
                            onClick={() => sendEmail(task)}
                          >
                            <Mail style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {filtered.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border-subtle)',
                background: '#FAFAFA',
              }}
            >
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {filtered.length} task{filtered.length !== 1 ? 's' : ''} · Click status or priority to edit inline
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          users={users}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={fetchTasks}
        />
      )}
    </AppLayout>
  );
}

const STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'delayed', label: 'Delayed' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
