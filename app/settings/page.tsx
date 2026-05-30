'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import { Save, Loader2, Mail, Bell, Calendar, Settings, Shield, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'calendar', label: 'Google Calendar', icon: Calendar },
  { key: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { can, loading: permLoading } = usePermissions();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>('general');

  // Redirect if settings.view permission is OFF
  useEffect(() => {
    if (!permLoading && user && !can('settings.view')) router.replace('/');
  }, [permLoading, can, user, router]);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    department: user?.department || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, department: user.department || '', phone: user.phone || '' });
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/users/${user?._id}`), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) { toast.success('Profile updated'); refreshUser(); }
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Error saving profile'); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <Header title="Settings" />

      <div className="page-content flex-1" style={{ maxWidth: 820 }}>
        {/* Tab bar */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2"
              style={{
                padding: '9px 16px', fontSize: 13, cursor: 'pointer', background: 'none',
                border: 'none', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                marginBottom: -1,
              }}
            >
              <t.icon style={{ width: 14, height: 14 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {tab === 'general' && (
          <div className="flex flex-col gap-5">
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600 }}>Your Profile</h3>
              <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="avatar avatar-lg" style={{ background: 'var(--primary)', fontSize: 16 }}>
                  {user ? getInitials(user.name) : '?'}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0 }}>{user?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: '#EEF2FF', color: '#6366F1',
                    }}>
                      {user?.role}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={saveProfile} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" value={profile.name}
                      onChange={e => setProfile(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Email (read-only)</label>
                    <input type="email" className="input" value={user?.email || ''} readOnly
                      style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Department</label>
                    <input className="input" value={profile.department}
                      onChange={e => setProfile(f => ({ ...f, department: e.target.value }))}
                      placeholder="e.g. Engineering" />
                  </div>
                  <div>
                    <label className="label">Phone (WhatsApp)</label>
                    <input className="input" value={profile.phone}
                      onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving
                      ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} />
                      : <><Save style={{ width: 14, height: 14 }} /> Save Changes</>
                    }
                  </button>
                </div>
              </form>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Company</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Company Name', value: 'B4Ucommerce' },
                  { label: 'Timezone', value: 'Asia/Kolkata (IST)' },
                  { label: 'Platform Version', value: 'Phase 2.5' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between"
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {tab === 'email' && (
          <div className="flex flex-col gap-5">
            <div className="card" style={{ padding: 24 }}>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail style={{ width: 20, height: 20, color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Email Configuration</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>SMTP via Nodemailer</p>
                </div>
              </div>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                  Email credentials are stored in <code style={{ fontFamily: 'monospace', background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>server/.env</code>.
                  Restart the server after updating.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { label: 'EMAIL_HOST', placeholder: 'smtp.gmail.com', example: 'smtp.gmail.com' },
                  { label: 'EMAIL_PORT', placeholder: '587', example: '587 (TLS) or 465 (SSL)' },
                  { label: 'EMAIL_USER', placeholder: 'your@gmail.com', example: 'Your Gmail address' },
                  { label: 'EMAIL_PASSWORD', placeholder: '••••••••••••••••', example: 'Gmail App Password (not your login password)' },
                  { label: 'EMAIL_FROM_NAME', placeholder: 'B4Utaskmanagement', example: 'Sender display name' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="label">{field.label}</label>
                    <div className="flex items-center gap-2">
                      <input className="input" placeholder={field.placeholder} style={{ fontFamily: 'monospace', flex: 1 }} readOnly />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 180 }}>{field.example}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Gmail App Password Setup</h3>
              <div className="flex flex-col gap-2">
                {[
                  'Go to myaccount.google.com → Security',
                  'Enable 2-Step Verification',
                  'Go to "App passwords"',
                  'Select "Mail" and "Other (custom name)"',
                  'Type "B4Utaskmanagement" and click Generate',
                  'Copy the 16-character password to EMAIL_PASSWORD',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#EEF2FF',
                      color: 'var(--primary)', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Google Calendar Tab */}
        {tab === 'calendar' && (
          <div className="flex flex-col gap-5">
            <div className="card" style={{ padding: 24 }}>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar style={{ width: 20, height: 20, color: '#3B82F6' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Google Meet Integration</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Auto-generated meet links</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5, background: '#ECFDF5', color: '#10B981' }}>
                  Active
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Google Meet links are automatically generated when you schedule a meeting. The format is
                <code style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '1px 4px', borderRadius: 3, margin: '0 4px' }}>
                  meet.google.com/xxx-xxxx-xxx
                </code>
                — no API credentials required.
              </p>

              <div className="flex flex-col gap-3">
                {[
                  { icon: CheckCircle2, color: '#10B981', label: 'Auto-generate Meet links', desc: 'Every new meeting gets a Google Meet link automatically' },
                  { icon: CheckCircle2, color: '#10B981', label: 'Join from dashboard', desc: '"Join Meeting" button appears on meeting cards and Today\'s Meetings section' },
                  { icon: CheckCircle2, color: '#10B981', label: 'WhatsApp sharing', desc: 'Share the meet link via WhatsApp directly from the meeting card' },
                  { icon: Shield, color: '#F59E0B', label: 'Full Calendar Sync (coming soon)', desc: 'Two-way sync with Google Calendar requires OAuth 2.0 credentials' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <item.icon style={{ width: 16, height: 16, color: item.color, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <div className="flex flex-col gap-5">
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Notification Channels</h3>
              {[
                {
                  icon: Mail, iconColor: 'var(--primary)',
                  label: 'Email Reminders', desc: 'HTML emails via Nodemailer SMTP',
                  badge: 'Nodemailer', badgeColor: 'var(--primary)',
                },
                {
                  icon: Bell, iconColor: '#F59E0B',
                  label: 'In-App Notifications', desc: 'Activity log and notification bell in-app',
                  badge: 'Active', badgeColor: '#10B981',
                },
                {
                  icon: () => <span style={{ fontSize: 14 }}>📱</span>, iconColor: '#25D366',
                  label: 'WhatsApp Reminders', desc: 'Free via wa.me link — one click from task/meeting card',
                  badge: 'Free', badgeColor: '#25D366',
                },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg mb-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: `${item.iconColor}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <item.icon style={{ width: 18, height: 18, color: item.iconColor } as any} />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)', margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                  </div>
                  <span className="badge" style={{
                    background: `${item.badgeColor}15`, color: item.badgeColor, fontSize: 11, flexShrink: 0,
                  }}>
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Automatic Reminder Schedule</h3>
              {[
                { trigger: 'Task deadline overdue', action: 'Email to owner · Daily check at 9 AM' },
                { trigger: '1 day before deadline', action: 'Email reminder to task owner' },
                { trigger: '60 min before meeting', action: 'Email to all participants' },
                { trigger: 'New task assigned', action: 'In-app notification to assignee' },
                { trigger: 'Meeting invite', action: 'In-app notification + email invite' },
              ].map(r => (
                <div key={r.trigger} className="flex items-center gap-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: 'var(--text)', flex: 1, margin: 0 }}>{r.trigger}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{r.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
