'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { IActivity, IUser } from '@/lib/types';
import { formatDate, getInitials } from '@/lib/utils';
import { Activity, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ENTITY_COLORS: Record<string, string> = {
  task: '#6366F1',
  meeting: '#10B981',
  user: '#F59E0B',
  comment: '#3B82F6',
  attachment: '#8B5CF6',
  system: '#94A3B8',
};

const ENTITY_BG: Record<string, string> = {
  task: '#EEF2FF',
  meeting: '#ECFDF5',
  user: '#FFFBEB',
  comment: '#EFF6FF',
  attachment: '#F5F3FF',
  system: '#F8FAFC',
};

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<IActivity[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 30;

  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set('search', search);
      if (filterUser) params.set('userId', filterUser);
      if (filterEntity) params.set('entityType', filterEntity);
      if (filterDate) { params.set('startDate', filterDate); params.set('endDate', filterDate); }

      const res = await fetch(apiUrl(`/api/activities?${params}`), { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setActivities(data.data.activities);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [user, page, search, filterUser, filterEntity, filterDate]);

  useEffect(() => {
    if (!authLoading && user) {
      fetch(apiUrl('/api/users'), { credentials: 'include' })
        .then(r => r.json())
        .then(d => { if (d.success) setUsers(d.data); });
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading) fetchActivities();
  }, [authLoading, fetchActivities]);

  const totalPages = Math.ceil(total / LIMIT);

  const clearFilters = () => {
    setSearch(''); setFilterUser(''); setFilterEntity(''); setFilterDate(''); setPage(1);
  };

  return (
    <AppLayout>
      <Header title="Activity Log" />
      <div className="page-content flex-1">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative" style={{ flex: '1 1 220px', maxWidth: 300 }}>
            <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input input-sm"
              style={{ paddingLeft: 30, width: '100%' }}
              placeholder="Search activities..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="input input-sm"
            style={{ width: 'auto', minWidth: 140 }}
            value={filterUser}
            onChange={e => { setFilterUser(e.target.value); setPage(1); }}
          >
            <option value="">All Users</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>

          <select
            className="input input-sm"
            style={{ width: 'auto', minWidth: 140 }}
            value={filterEntity}
            onChange={e => { setFilterEntity(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="task">Tasks</option>
            <option value="meeting">Meetings</option>
            <option value="user">Team</option>
            <option value="comment">Comments</option>
            <option value="attachment">Attachments</option>
          </select>

          <input
            type="date"
            className="input input-sm"
            style={{ width: 'auto' }}
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1); }}
          />

          {(search || filterUser || filterEntity || filterDate) && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ fontSize: 12 }}>
              Clear
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {total} activities
          </span>
        </div>

        {/* Timeline */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Activity style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
              </div>
              <p style={{ fontWeight: 500, color: 'var(--text)' }}>No activities found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Activities will appear here as your team works</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {activities.map((act, idx) => {
                const color = ENTITY_COLORS[act.entityType] || '#94A3B8';
                const bg = ENTITY_BG[act.entityType] || '#F8FAFC';
                const isLast = idx === activities.length - 1;

                return (
                  <div
                    key={act._id}
                    className="flex gap-4"
                    style={{ padding: '12px 20px', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}
                  >
                    {/* Avatar */}
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <div
                        className="avatar avatar-sm"
                        style={{ background: 'var(--primary)', fontSize: 10 }}
                      >
                        {act.user ? getInitials(act.user.name) : '?'}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {act.user?.name || 'System'}
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                          {act.action}
                        </span>
                        {act.entityTitle && (
                          <span
                            style={{
                              fontSize: 13, fontWeight: 500, color, background: bg,
                              padding: '1px 8px', borderRadius: 4,
                            }}
                          >
                            {act.entityTitle}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            fontSize: 11, color, background: bg,
                            padding: '1px 6px', borderRadius: 4, fontWeight: 500,
                          }}
                        >
                          {act.entityType}
                        </span>
                        {act.details && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {act.details}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {new Date(act.createdAt).toLocaleString('en-IN', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
