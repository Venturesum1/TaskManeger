'use client';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ITask, IUser, TaskStatus, TaskPriority } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface Props {
  task?: ITask | null;
  users: IUser[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, users, onClose, onSaved }: Props) {
  const isEdit = !!task;
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    owner: users[0]?._id || '',
    priority: 'medium' as TaskPriority,
    status: 'not_started' as TaskStatus,
    startDate: '',
    endDate: '',
    milestone: '',
  });

  useEffect(() => {
    if (task) {
      const ownerId = typeof task.owner === 'object' ? task.owner._id : task.owner as string;
      setForm({
        title: task.title,
        description: task.description || '',
        owner: ownerId,
        priority: task.priority,
        status: task.status,
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        endDate: task.endDate ? task.endDate.split('T')[0] : '',
        milestone: task.milestone || '',
      });
    }
  }, [task]);

  const set = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      const url = isEdit ? apiUrl(`/api/tasks/${task!._id}`) : apiUrl('/api/tasks');
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? 'Task updated' : 'Task created');
        onSaved();
        onClose();
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Delete this task?')) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/tasks/${task._id}`), { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        toast.success('Task deleted');
        onSaved();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: 16 }}>
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="label">Task Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="input"
                placeholder="Enter task title..."
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="input"
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            {/* Owner + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Owner</label>
                <select value={form.owner} onChange={e => set('owner', e.target.value)} className="input">
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input">
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Status + Milestone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Milestone</label>
                <input
                  type="text"
                  value={form.milestone}
                  onChange={e => set('milestone', e.target.value)}
                  className="input"
                  placeholder="e.g. Q1 Launch"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger btn-sm"
                style={{ marginRight: 'auto' }}
                disabled={loading}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading
                ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
                : isEdit ? 'Save Changes' : 'Create Task'
              }
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
