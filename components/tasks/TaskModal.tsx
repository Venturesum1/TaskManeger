'use client';
import { useState, useEffect, useRef } from 'react';
import {
  X, Loader2, MessageSquare, Clock, Paperclip,
  Send, Play, Square, Download, Trash2, FileText,
  Image, File, Upload,
} from 'lucide-react';
import { ITask, IUser, IComment, ITimeEntry, IAttachment, TaskStatus, TaskPriority } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import toast from 'react-hot-toast';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'delayed', label: 'Delayed' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fileIcon(mimetype: string) {
  if (mimetype.startsWith('image/')) return <Image style={{ width: 14, height: 14 }} />;
  if (mimetype === 'application/pdf') return <FileText style={{ width: 14, height: 14 }} />;
  return <File style={{ width: 14, height: 14 }} />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  task?: ITask | null;
  users: IUser[];
  onClose: () => void;
  onSaved: () => void;
  defaultStatus?: TaskStatus;
}

export default function TaskModal({ task, users, onClose, onSaved, defaultStatus }: Props) {
  const { user: currentUser } = useAuth();
  const canAssign = usePermission('tasks.assign');
  // Lock owner to self only when the user cannot assign tasks to others
  const ownerLocked = !canAssign && currentUser?.role === 'member';
  const isEdit = !!task;
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'time' | 'files'>('details');
  const [loading, setLoading] = useState(false);

  const defaultOwner = ownerLocked ? (currentUser?._id ?? '') : (users[0]?._id || '');

  // Details form
  const [form, setForm] = useState({
    title: '', description: '', owner: defaultOwner,
    priority: 'medium' as TaskPriority, status: (defaultStatus || 'not_started') as TaskStatus,
    startDate: '', endDate: '', milestone: '', estimatedHours: '',
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
        estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
      });
    } else if (defaultStatus) {
      setForm(f => ({ ...f, status: defaultStatus }));
    }
  }, [task, defaultStatus]);

  const set = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const url = isEdit ? apiUrl(`/api/tasks/${task!._id}`) : apiUrl('/api/tasks');
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0 }),
      });
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? 'Task updated' : 'Task created'); onSaved(); onClose(); }
      else toast.error(data.error || 'Something went wrong');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Delete this task?')) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/tasks/${task._id}`), { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { toast.success('Task deleted'); onSaved(); onClose(); }
    } finally { setLoading(false); }
  };

  const tabs = [
    { key: 'details', label: 'Details' },
    ...(isEdit ? [
      { key: 'comments', label: 'Comments' },
      { key: 'time', label: 'Time' },
      { key: 'files', label: 'Files' },
    ] : []),
  ] as const;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: 16 }}>{isEdit ? 'Task Details' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Tabs */}
        {isEdit && (
          <div className="flex" style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', flexShrink: 0 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                style={{
                  padding: '9px 16px', fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
                  color: activeTab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div>
                  <label className="label">Task Title *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                    className="input" placeholder="Enter task title..." required autoFocus={!isEdit} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)}
                    className="input" placeholder="Optional description..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Owner</label>
                    {ownerLocked ? (
                      <input
                        className="input"
                        value={currentUser?.name ?? ''}
                        disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                      />
                    ) : (
                      <select value={form.owner} onChange={e => set('owner', e.target.value)} className="input">
                        {users.map(u => (
                          <option key={u._id} value={u._id}>
                            {u.name}{u.department ? ` — ${u.department}` : ` (${u.role})`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input">
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Milestone</label>
                    <input type="text" value={form.milestone} onChange={e => set('milestone', e.target.value)}
                      className="input" placeholder="e.g. Q1 Launch" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Start Date</label>
                    <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">End Date</label>
                    <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Est. Hours</label>
                    <input type="number" min="0" step="0.5" value={form.estimatedHours}
                      onChange={e => set('estimatedHours', e.target.value)}
                      className="input" placeholder="8" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {isEdit && (
                  <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm"
                    style={{ marginRight: 'auto' }} disabled={loading}>
                    Delete
                  </button>
                )}
                <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
                    : isEdit ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'comments' && task && (
            <CommentsTab taskId={task._id} currentUser={currentUser} users={users} />
          )}

          {activeTab === 'time' && task && (
            <TimeTab taskId={task._id} estimatedHours={task.estimatedHours} />
          )}

          {activeTab === 'files' && task && (
            <FilesTab taskId={task._id} />
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Comments Tab ──────────────────────────────────────────────────────────

function CommentsTab({ taskId, currentUser, users }: { taskId: string; currentUser: any; users: IUser[] }) {
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchComments = async () => {
    const res = await fetch(apiUrl(`/api/tasks/${taskId}/comments`), { credentials: 'include' });
    const data = await res.json();
    if (data.success) setComments(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [taskId]);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/tasks/${taskId}/comments`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.success) { setText(''); fetchComments(); }
    } finally { setSubmitting(false); }
  };

  const saveEdit = async (id: string) => {
    await fetch(apiUrl(`/api/tasks/${taskId}/comments/${id}`), {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editText }),
    });
    setEditId(null);
    fetchComments();
  };

  const deleteComment = async (id: string) => {
    await fetch(apiUrl(`/api/tasks/${taskId}/comments/${id}`), { method: 'DELETE', credentials: 'include' });
    fetchComments();
  };

  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Loading...</p>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <MessageSquare style={{ width: 24, height: 24, color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No comments yet. Start the conversation.</p>
        </div>
      ) : (
        comments.map(c => (
          <div key={c._id} className="flex gap-3">
            <div className="avatar avatar-sm flex-shrink-0" style={{ background: 'var(--primary)', fontSize: 10 }}>
              {getInitials(c.author?.name || '?')}
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.author?.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(c.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {currentUser?._id === c.author?._id && editId !== c._id && (
                  <div className="flex gap-1" style={{ marginLeft: 'auto' }}>
                    <button
                      className="btn btn-ghost btn-icon-sm"
                      style={{ fontSize: 11, height: 20, padding: '0 6px', width: 'auto' }}
                      onClick={() => { setEditId(c._id); setEditText(c.content); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-icon-sm"
                      style={{ fontSize: 11, height: 20, padding: '0 6px', width: 'auto', color: '#EF4444' }}
                      onClick={() => deleteComment(c._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {editId === c._id ? (
                <div className="flex gap-2">
                  <input
                    className="input input-sm"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(c._id); if (e.key === 'Escape') setEditId(null); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c._id)}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{c.content}</p>
              )}
            </div>
          </div>
        ))
      )}

      {/* Input */}
      <div className="flex gap-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
        <div className="avatar avatar-sm flex-shrink-0" style={{ background: 'var(--primary)', fontSize: 10 }}>
          {getInitials(currentUser?.name || '?')}
        </div>
        <input
          className="input input-sm"
          style={{ flex: 1 }}
          placeholder="Add a comment... (Enter to send)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={submitting || !text.trim()}
        >
          <Send style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}

// ─── Time Tab ──────────────────────────────────────────────────────────────

function TimeTab({ taskId, estimatedHours }: { taskId: string; estimatedHours?: number }) {
  const [data, setData] = useState<{ entries: ITimeEntry[]; totalSeconds: number; running: ITimeEntry | null }>({
    entries: [], totalSeconds: 0, running: null,
  });
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<any>(null);

  const fetchTime = async () => {
    const res = await fetch(apiUrl(`/api/tasks/${taskId}/time`), { credentials: 'include' });
    const d = await res.json();
    if (d.success) {
      setData(d.data);
      if (d.data.running) {
        const started = new Date(d.data.running.startedAt).getTime();
        setElapsed(Math.floor((Date.now() - started) / 1000));
      } else {
        setElapsed(0);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchTime(); return () => clearInterval(intervalRef.current); }, [taskId]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (data.running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [data.running]);

  const start = async () => {
    await fetch(apiUrl(`/api/tasks/${taskId}/time/start`), { method: 'POST', credentials: 'include' });
    fetchTime();
  };

  const stop = async () => {
    await fetch(apiUrl(`/api/tasks/${taskId}/time/stop`), { method: 'POST', credentials: 'include' });
    fetchTime();
    toast.success('Timer stopped');
  };

  const totalLogged = data.totalSeconds + (data.running ? elapsed : 0);
  const estimatedSeconds = (estimatedHours || 0) * 3600;

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Timer */}
      <div className="card" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 40, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', margin: '0 0 12px' }}>
          {formatSeconds(data.running ? elapsed : 0)}
        </p>
        {data.running ? (
          <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={stop}>
            <Square style={{ width: 13, height: 13 }} />
            Stop Timer
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={start}>
            <Play style={{ width: 13, height: 13 }} />
            Start Timer
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card" style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>Time Spent</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#6366F1', margin: 0 }}>{formatSeconds(totalLogged)}</p>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>Estimated</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#10B981', margin: 0 }}>
            {estimatedHours ? `${estimatedHours}h` : '—'}
          </p>
        </div>
      </div>

      {/* Progress */}
      {estimatedSeconds > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Progress</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {Math.min(100, Math.round((totalLogged / estimatedSeconds) * 100))}%
            </span>
          </div>
          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.round((totalLogged / estimatedSeconds) * 100))}%`,
              background: totalLogged > estimatedSeconds ? '#EF4444' : '#10B981',
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Log */}
      {loading ? null : data.entries.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Session History
          </p>
          {data.entries.filter(e => !e.isRunning).slice(0, 10).map(e => (
            <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(e.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                {' · '}{(e.user as any)?.name?.split(' ')[0]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{formatSeconds(e.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Files Tab ─────────────────────────────────────────────────────────────

function FilesTab({ taskId }: { taskId: string }) {
  const [attachments, setAttachments] = useState<IAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    const res = await fetch(apiUrl(`/api/tasks/${taskId}/attachments`), { credentials: 'include' });
    const data = await res.json();
    if (data.success) setAttachments(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchAttachments(); }, [taskId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(apiUrl(`/api/tasks/${taskId}/attachments`), {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json();
      if (data.success) { toast.success('File uploaded'); fetchAttachments(); }
      else toast.error(data.error || 'Upload failed');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  };

  const deleteFile = async (id: string) => {
    await fetch(apiUrl(`/api/tasks/${taskId}/attachments/${id}`), { method: 'DELETE', credentials: 'include' });
    fetchAttachments();
    toast.success('File deleted');
  };

  const download = (id: string, name: string) => {
    const a = document.createElement('a');
    a.href = apiUrl(`/api/tasks/${taskId}/attachments/${id}/download`);
    a.download = name;
    a.click();
  };

  return (
    <div style={{ padding: '16px 24px' }}>
      <div
        className="flex items-center justify-center flex-col gap-2"
        style={{
          border: '2px dashed var(--border)', borderRadius: 10, padding: '20px',
          marginBottom: 16, cursor: 'pointer', background: 'var(--bg)',
        }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          {uploading ? 'Uploading...' : 'Click to upload a file'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>PDF, DOCX, XLSX, PNG, JPG, ZIP · Max 10MB</p>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={upload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip" />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</p>
      ) : attachments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Paperclip style={{ width: 20, height: 20, color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No files attached</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map(att => (
            <div key={att._id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6, background: '#EEF2FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', flexShrink: 0,
              }}>
                {fileIcon(att.mimetype)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.originalName}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  {formatFileSize(att.size)} · {(att.uploadedBy as any)?.name?.split(' ')[0]}
                  {' · '}{new Date(att.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-icon-sm" title="Download" onClick={() => download(att._id, att.originalName)}>
                  <Download style={{ width: 13, height: 13 }} />
                </button>
                <button className="btn btn-ghost btn-icon-sm" title="Delete" onClick={() => deleteFile(att._id)}>
                  <Trash2 style={{ width: 13, height: 13, color: '#EF4444' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
