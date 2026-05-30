'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, DragStartEvent, DragEndEvent, DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import TaskModal from '@/components/tasks/TaskModal';
import { ITask, IUser, TaskStatus } from '@/lib/types';
import { formatDate, isOverdue, getDaysRemaining, getInitials } from '@/lib/utils';
import { Plus, GripVertical, Clock, AlertTriangle } from 'lucide-react';
import { PriorityBadge } from '@/components/tasks/StatusBadge';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const COLUMNS: { id: string; label: string; color: string; bg: string }[] = [
  { id: 'not_started', label: 'Todo',        color: '#94A3B8', bg: '#F8FAFC' },
  { id: 'in_progress', label: 'In Progress', color: '#6366F1', bg: '#EEF2FF' },
  { id: 'blocked',     label: 'Blocked',     color: '#EF4444', bg: '#FEF2F2' },
  { id: 'delayed',     label: 'Delayed',     color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'completed',   label: 'Completed',   color: '#10B981', bg: '#ECFDF5' },
];

// ─── Sortable card ──────────────────────────────────────────────────────────

function TaskCard({
  task, onClick, overlay = false,
}: { task: ITask; onClick: () => void; overlay?: boolean }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: 'grab',
  };

  const owner = typeof task.owner === 'object' ? task.owner : null;
  const late = task.endDate ? isOverdue(task.endDate, task.status) : false;
  const daysLeft = task.endDate ? getDaysRemaining(task.endDate) : null;
  const urgent = !late && daysLeft !== null && daysLeft <= 2;

  const card = (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: overlay ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: overlay ? 'rotate(1.5deg)' : undefined,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        {/* Drag handle — stops card click from firing */}
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', flexShrink: 0, paddingTop: 2, color: 'var(--text-muted)' }}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical style={{ width: 13, height: 13 }} />
        </div>
        <p
          style={{
            fontSize: 13, fontWeight: 500, color: 'var(--text)',
            margin: 0, flex: 1, lineHeight: 1.4, cursor: 'pointer',
          }}
          onClick={onClick}
        >
          {task.title}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {owner && (
          <div
            className="avatar"
            style={{ width: 22, height: 22, fontSize: 8, background: 'var(--primary)', flexShrink: 0 }}
            title={owner.name}
          >
            {getInitials(owner.name)}
          </div>
        )}
      </div>

      {task.endDate && (
        <div
          className="flex items-center gap-1 mt-2"
          style={{
            fontSize: 11,
            color: late ? '#EF4444' : urgent ? '#F59E0B' : 'var(--text-muted)',
            fontWeight: late || urgent ? 600 : 400,
          }}
        >
          {late
            ? <AlertTriangle style={{ width: 10, height: 10 }} />
            : <Clock style={{ width: 10, height: 10 }} />}
          {late ? `Overdue · ${formatDate(task.endDate)}` : formatDate(task.endDate)}
        </div>
      )}
    </div>
  );

  if (overlay) return card;

  return (
    <div ref={setNodeRef} style={style}>
      {card}
    </div>
  );
}

// ─── Droppable column ───────────────────────────────────────────────────────

function KanbanColumn({
  column, tasks, onCardClick, onAddTask,
}: {
  column: typeof COLUMNS[number];
  tasks: ITask[];
  onCardClick: (t: ITask) => void;
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: isOver ? `${column.color}10` : column.bg,
        borderRadius: 12,
        border: `1.5px solid ${isOver ? column.color : 'var(--border)'}`,
        maxHeight: 'calc(100vh - 180px)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: column.color }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {column.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              background: `${column.color}20`, color: column.color,
            }}>
              {tasks.length}
            </span>
          </div>
          <button
            className="btn btn-ghost btn-icon-sm"
            title={`Add to ${column.label}`}
            onClick={onAddTask}
          >
            <Plus style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Droppable + sortable area */}
      <div
        ref={setNodeRef}
        style={{ flex: 1, overflowY: 'auto', padding: '8px' }}
      >
        <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={() => onCardClick(task)}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div
            style={{
              textAlign: 'center', padding: '32px 0',
              border: '1.5px dashed var(--border)', borderRadius: 8, marginTop: 4,
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<ITask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('not_started');
  const [activeTask, setActiveTask] = useState<ITask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchTasks = async () => {
    try {
      const [tRes, uRes] = await Promise.all([
        fetch(apiUrl('/api/tasks'), { credentials: 'include' }),
        fetch(apiUrl('/api/users'), { credentials: 'include' }),
      ]);
      const [tData, uData] = await Promise.all([tRes.json(), uRes.json()]);
      if (tData.success) setTasks(tData.data);
      if (uData.success) setUsers(uData.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authLoading && user) fetchTasks();
  }, [authLoading, user]);

  // Map: taskId → columnId for fast lookup
  const taskColumnMap = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => map.set(t._id, t.status));
    return map;
  }, [tasks]);

  const columns = useMemo(() =>
    COLUMNS.map(col => ({
      ...col,
      tasks: tasks.filter(t => t.status === col.id),
    })),
    [tasks]
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find(t => t._id === active.id) ?? null);
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;
    if (draggedId === overId) return;

    // Determine target column:
    //   • If over.id is a column id → dropped on empty column
    //   • Otherwise over.id is a task id → find its column
    const isColumn = COLUMNS.some(c => c.id === overId);
    const targetStatus = isColumn
      ? overId
      : (taskColumnMap.get(overId) ?? null);

    if (!targetStatus) return;

    const currentStatus = taskColumnMap.get(draggedId);
    if (currentStatus === targetStatus) return; // same column, no-op

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t._id === draggedId ? { ...t, status: targetStatus as TaskStatus } : t)
    );

    try {
      const res = await fetch(apiUrl(`/api/tasks/${draggedId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert
        setTasks(prev =>
          prev.map(t => t._id === draggedId ? { ...t, status: currentStatus as TaskStatus } : t)
        );
        toast.error('Failed to update task');
      }
    } catch {
      setTasks(prev =>
        prev.map(t => t._id === draggedId ? { ...t, status: currentStatus as TaskStatus } : t)
      );
    }
  };

  const defaultStatusForColumn = (colId: string): TaskStatus =>
    COLUMNS.some(c => c.id === colId) ? (colId as TaskStatus) : 'not_started';

  return (
    <AppLayout>
      <Header
        title="Kanban Board"
        onNewTask={() => { setEditTask(null); setShowModal(true); }}
      />

      <div className="page-content flex-1" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading board...</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex gap-4"
              style={{ minWidth: 'max-content', paddingBottom: 20, alignItems: 'flex-start' }}
            >
              {columns.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={col.tasks}
                  onCardClick={task => { setEditTask(task); setShowModal(true); }}
                  onAddTask={() => {
                    setEditTask(null);
                    setNewTaskStatus(col.id as TaskStatus);
                    setShowModal(true);
                  }}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeTask ? (
                <div style={{ width: 260 }}>
                  <TaskCard task={activeTask} onClick={() => {}} overlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          users={users}
          defaultStatus={editTask ? undefined : newTaskStatus}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={fetchTasks}
        />
      )}
    </AppLayout>
  );
}
