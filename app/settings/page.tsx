'use client';
import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';
import { Save, Loader2, Database, Mail, MessageCircle, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'notifications' | 'integrations'>('profile');

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    phone: user?.phone || '',
  });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user?._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) toast.success('Profile updated');
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'integrations', label: 'Integrations' },
  ] as const;

  return (
    <AppLayout>
      <Header title="Settings" />

      <div className="page-content flex-1" style={{ maxWidth: 760 }}>
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn btn-sm"
              style={{
                background: tab === t.key ? 'var(--surface)' : 'transparent',
                border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="card" style={{ padding: 24 }}>
            <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="avatar avatar-lg" style={{ background: 'var(--primary)', fontSize: 16 }}>
                {user ? getInitials(user.name) : '?'}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)', margin: 0 }}>{user?.name}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{user?.role} · {user?.email}</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={profile.name} onChange={e => setProfile(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={profile.email} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={profile.department} onChange={e => setProfile(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Engineering" />
                </div>
                <div>
                  <label className="label">Phone (WhatsApp)</label>
                  <input className="input" value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.7s linear infinite' }} /> : <><Save style={{ width: 14, height: 14 }} /> Save Profile</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notifications tab */}
        {tab === 'notifications' && (
          <div className="flex flex-col gap-4">
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14 }}>Notification Channels</h3>
              {[
                { icon: MessageCircle, iconColor: '#25D366', label: 'WhatsApp Reminders', desc: 'Free via wa.me direct link — opens WhatsApp with pre-filled message', badge: 'Free', badgeColor: '#25D366' },
                { icon: Mail, iconColor: 'var(--primary)', label: 'Email Reminders', desc: 'HTML emails via Nodemailer — configure SMTP in .env.local', badge: 'Nodemailer', badgeColor: 'var(--primary)' },
                { icon: Bell, iconColor: '#F59E0B', label: 'Browser Notifications', desc: 'Push notifications via Web Push API — works offline', badge: 'Free', badgeColor: '#F59E0B' },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 rounded-lg mb-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon style={{ width: 18, height: 18, color: item.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)', margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                  </div>
                  <span className="badge" style={{ background: `${item.badgeColor}15`, color: item.badgeColor, fontSize: 11, flexShrink: 0 }}>
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Reminder Triggers</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
                Automatic reminders are sent via the reminder buttons on each task and meeting.
              </p>
              {[
                { trigger: 'Task overdue', action: 'WhatsApp + Email to owner' },
                { trigger: '1 day before meeting', action: 'Email to all participants' },
                { trigger: 'Task deadline approaching (2 days)', action: 'WhatsApp link available on task row' },
              ].map(r => (
                <div key={r.trigger} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: 'var(--text)', flex: 1, margin: 0 }}>{r.trigger}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textAlign: 'right' }}>{r.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrations tab */}
        {tab === 'integrations' && (
          <div className="flex flex-col gap-4">
            {[
              {
                icon: '📅',
                title: 'Google Meet',
                status: 'Auto-generated',
                statusColor: '#059669',
                statusBg: '#ECFDF5',
                desc: 'Google Meet links are auto-generated in the format meet.google.com/xxx-xxx-xxx when scheduling meetings. No API key needed for basic link generation.',
                steps: null,
              },
              {
                icon: '💾',
                title: 'MongoDB Atlas',
                status: 'Connected',
                statusColor: '#059669',
                statusBg: '#ECFDF5',
                desc: 'Your MongoDB connection string is configured in .env.local. All tasks, meetings, and users are stored in MongoDB Atlas.',
                steps: null,
              },
              {
                icon: '📧',
                title: 'Email (Nodemailer)',
                status: 'Configure required',
                statusColor: '#F59E0B',
                statusBg: '#FFFBEB',
                desc: 'Add your SMTP credentials to .env.local to enable email reminders.',
                steps: [
                  'Open .env.local',
                  'Set EMAIL_HOST=smtp.gmail.com',
                  'Set EMAIL_USER=your@gmail.com',
                  'Generate App Password in Google Account settings',
                  'Set EMAIL_PASS=your_app_password',
                ],
              },
              {
                icon: '📱',
                title: 'WhatsApp (Free)',
                status: 'Ready to use',
                statusColor: '#25D366',
                statusBg: '#F0FDF4',
                desc: 'Uses the free wa.me link method. Click the WhatsApp button on any task/meeting to send a pre-filled message directly. No API key or Twilio required.',
                steps: null,
              },
            ].map(item => (
              <div key={item.title} className="card" style={{ padding: 20 }}>
                <div className="flex items-center gap-3 mb-2">
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>{item.title}</p>
                      <span className="badge" style={{ background: item.statusBg, color: item.statusColor, fontSize: 11 }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px' }}>{item.desc}</p>
                {item.steps && (
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Setup steps:</p>
                    {item.steps.map((step, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0', fontFamily: 'monospace' }}>
                        {i + 1}. {step}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
