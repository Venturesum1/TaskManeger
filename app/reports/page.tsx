'use client';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { AnalyticsData } from '@/lib/types';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  CheckCircle2, Clock, AlertTriangle, Video,
  TrendingUp, CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const KPI_CARDS = (data: AnalyticsData['kpis']) => [
  { label: 'Total Tasks', value: data.totalTasks, icon: CheckSquare, color: '#6366F1', bg: '#EEF2FF' },
  { label: 'Pending', value: data.pending, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Completed', value: data.completed, icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
  { label: 'Completed This Month', value: data.completedThisMonth, icon: TrendingUp, color: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Overdue Tasks', value: data.overdue, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
  { label: 'Upcoming Meetings', value: data.upcomingMeetings, icon: Video, color: '#3B82F6', bg: '#EFF6FF' },
];

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    fetch(apiUrl('/api/analytics'), { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setAnalytics(d.data); })
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (loading) {
    return (
      <AppLayout>
        <Header title="Reports & Analytics" />
        <div className="page-content flex-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  if (!analytics) return null;

  const nonZeroStatus = analytics.tasksByStatus.filter(s => s.value > 0);

  return (
    <AppLayout>
      <Header title="Reports & Analytics" />
      <div className="page-content flex-1">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {KPI_CARDS(analytics.kpis).map(card => (
            <div key={card.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {card.label}
                </p>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: card.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <card.icon style={{ width: 16, height: 16, color: card.color }} />
                </div>
              </div>
              <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Tasks By Status — Pie */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Tasks by Status</h3>
            {nonZeroStatus.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No tasks yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={nonZeroStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {nonZeroStatus.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [value, name]} />
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span style={{ fontSize: 12, color: 'var(--text)' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tasks By User — Bar */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Workload by Team Member</h3>
            {analytics.tasksByUser.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.tasksByUser} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickFormatter={v => v.split(' ')[0]}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span style={{ fontSize: 12, color: 'var(--text)' }}>{value}</span>}
                  />
                  <Bar dataKey="total" name="Total" fill="#6366F1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="inProgress" name="In Progress" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* User Table */}
        {analytics.tasksByUser.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Total Tasks</th>
                  <th>Completed</th>
                  <th>In Progress</th>
                  <th>Blocked</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.tasksByUser.map(row => {
                  const rate = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
                  return (
                    <tr key={row._id}>
                      <td>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{row.name}</span>
                      </td>
                      <td><span style={{ fontSize: 13 }}>{row.total}</span></td>
                      <td>
                        <span style={{ fontSize: 13, color: '#10B981', fontWeight: 500 }}>{row.completed}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>{row.inProgress}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>{row.blocked}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                            <div style={{
                              width: `${rate}%`, height: '100%',
                              background: rate >= 70 ? '#10B981' : rate >= 40 ? '#F59E0B' : '#EF4444',
                              borderRadius: 3, transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
