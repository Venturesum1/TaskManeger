'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, Users, BarChart3 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';

interface WorkloadEntry {
  user: { _id: string; name: string; email: string; role: string; department?: string };
  totalTasks: number;
  assigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
  estimatedHours: number;
  actualHours: number;
  utilization: number;
  completionRate: number;
  load: 'green' | 'yellow' | 'red';
}

const LOAD_CFG = {
  green:  { label: 'Normal',     bg: '#ECFDF5', color: '#10B981', border: '#A7F3D0' },
  yellow: { label: 'Moderate',   bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  red:    { label: 'Overloaded', bg: '#FEF2F2', color: '#EF4444', border: '#FECACA' },
};

export default function WorkloadPage() {
  const { user, loading: authLoading } = useAuth();
  const { can, loading: permLoading } = usePermissions();
  const router = useRouter();
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);

  useEffect(() => {
    if (!permLoading && user && !can('sidebar.workload')) router.replace('/');
  }, [permLoading, can, user, router]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!['admin', 'manager'].includes(user.role)) {
      router.replace('/');
      return;
    }
    fetch(apiUrl('/api/workload'), { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setWorkload(d.data); else toast.error(d.message || 'Failed to load workload'); })
      .catch(() => toast.error('Network error'))
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <Header title="Workload" />
        <div className="page-content flex-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading workload data...</p>
        </div>
      </AppLayout>
    );
  }

  const overloaded = workload.filter(w => w.load === 'red');
  const moderate = workload.filter(w => w.load === 'yellow');
  const normal = workload.filter(w => w.load === 'green');

  const chartData = workload.map(w => ({
    name: w.user.name.split(' ')[0],
    'Assigned': w.assigned,
    'Completed': w.completed,
    'In Progress': w.inProgress,
    'Overdue': w.overdue,
  }));

  return (
    <AppLayout>
      <Header title="Workload Management" />
      <div className="page-content flex-1">

        {/* KPI Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Members', value: workload.length, icon: Users, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Normal Load', value: normal.length, icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Moderate Load', value: moderate.length, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Overloaded', value: overloaded.length, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
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

        {/* Load alerts */}
        {overloaded.length > 0 && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>
              <strong>{overloaded.length} team member{overloaded.length > 1 ? 's are' : ' is'} overloaded</strong>
              {' '}with 10+ open tasks: {overloaded.map(w => w.user.name.split(' ')[0]).join(', ')}
            </p>
          </div>
        )}

        {/* Bar Chart */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart3 style={{ width: 16, height: 16, color: 'var(--text-muted)' }} /> Tasks per Team Member
          </h3>
          {workload.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Legend iconType="circle" iconSize={9}
                  formatter={v => <span style={{ fontSize: 12, color: 'var(--text)' }}>{v}</span>} />
                <Bar dataKey="Assigned" fill="#6366F1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Completed" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="In Progress" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Overdue" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Workload Table */}
        <div className="table-wrap">
          {workload.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Users style={{ width: 20, height: 20, color: 'var(--text-muted)' }} /></div>
              <p style={{ fontWeight: 500, color: 'var(--text)' }}>No team members found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Add team members and assign tasks to see workload data</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Team Member</th>
                  <th style={{ minWidth: 80 }}>Load</th>
                  <th style={{ minWidth: 80 }}>Assigned</th>
                  <th style={{ minWidth: 90 }}>Completed</th>
                  <th style={{ minWidth: 90 }}>In Progress</th>
                  <th style={{ minWidth: 80 }}>Overdue</th>
                  <th style={{ minWidth: 100 }}>Est. Hours</th>
                  <th style={{ minWidth: 100 }}>Actual Hrs</th>
                  <th style={{ minWidth: 120 }}>Completion Rate</th>
                  <th style={{ minWidth: 110 }}>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {workload.map(entry => {
                  const loadCfg = LOAD_CFG[entry.load];
                  return (
                    <tr key={entry.user._id}>
                      {/* Member */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: 10, background: 'var(--primary)', flexShrink: 0 }}>
                            {getInitials(entry.user.name)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0, fontSize: 13 }}>{entry.user.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>
                              {entry.user.role}{entry.user.department ? ` · ${entry.user.department}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Load indicator */}
                      <td>
                        <span className="badge" style={{
                          background: loadCfg.bg, color: loadCfg.color,
                          border: `1px solid ${loadCfg.border}`, fontSize: 11, fontWeight: 600,
                        }}>
                          {loadCfg.label}
                        </span>
                      </td>

                      <td><span style={{ fontSize: 13, fontWeight: 500 }}>{entry.assigned}</span></td>
                      <td><span style={{ fontSize: 13, color: '#10B981', fontWeight: 500 }}>{entry.completed}</span></td>
                      <td><span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>{entry.inProgress}</span></td>
                      <td>
                        <span style={{ fontSize: 13, color: entry.overdue > 0 ? '#EF4444' : 'var(--text-muted)', fontWeight: entry.overdue > 0 ? 600 : 400 }}>
                          {entry.overdue}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.estimatedHours}h</span></td>
                      <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.actualHours}h</span></td>

                      {/* Completion rate */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, minWidth: 50 }}>
                            <div style={{
                              width: `${entry.completionRate}%`, height: '100%', borderRadius: 3,
                              background: entry.completionRate >= 70 ? '#10B981' : entry.completionRate >= 40 ? '#F59E0B' : '#EF4444',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{entry.completionRate}%</span>
                        </div>
                      </td>

                      {/* Utilization */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, minWidth: 50 }}>
                            <div style={{
                              width: `${Math.min(entry.utilization, 100)}%`, height: '100%', borderRadius: 3,
                              background: entry.utilization > 100 ? '#EF4444' : entry.utilization >= 70 ? '#10B981' : '#6366F1',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 36 }}>
                            {entry.utilization > 0 ? `${entry.utilization}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {workload.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', background: '#FAFAFA' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Green = 0–5 open tasks · Yellow = 6–10 · Red = 11+ · Utilization = actual/estimated hours
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
