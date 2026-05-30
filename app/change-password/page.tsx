'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl } from '@/lib/api';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

const RULES = [
  { label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)',    test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number (0-9)',              test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (@#$!…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ── Moved OUTSIDE the page component so React never remounts it on re-render ──
function PassField({
  label, value, onChange, show, onToggle, placeholder, autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input"
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute"
          style={{
            right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, color: 'var(--text-placeholder)',
          }}
        >
          {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [current,     setCurrent]     = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (user && !user.requiresPasswordChange) {
      router.replace(user.role === 'client' ? '/client' : '/');
    }
  }, [user, router]);

  const passRules = RULES.map(r => ({ ...r, ok: r.test(newPass) }));
  const allRulesOk = passRules.every(r => r.ok);
  const confirmOk  = newPass === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesOk) return toast.error('Password does not meet requirements');
    if (!confirmOk)  return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/change-password'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password changed! Welcome to your dashboard.');
        await refreshUser();
        router.replace(user?.role === 'client' ? '/client' : '/');
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3 rounded-2xl overflow-hidden shadow-md" style={{ width: 60, height: 60 }}>
            <Image src="/logo.jpg" alt="B4U" width={60} height={60} style={{ objectFit: 'cover' }} />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
            borderRadius: 10, padding: '8px 16px', marginBottom: 8,
          }}>
            <ShieldCheck style={{ width: 18, height: 18, color: '#fff' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Security Required</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Set Your New Password
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
            {user?.isFirstLogin
              ? 'Welcome! You must set a new password before accessing the system.'
              : 'Your admin has requested a password change.'}
          </p>
        </div>

        <div className="card" style={{ padding: '24px 24px 20px' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PassField
              label="Current / Temporary Password"
              value={current}
              onChange={setCurrent}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              placeholder="Enter temporary password"
              autoComplete="current-password"
            />

            <PassField
              label="New Password"
              value={newPass}
              onChange={setNewPass}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              placeholder="Create strong password"
              autoComplete="new-password"
            />

            {newPass.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                {passRules.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    {r.ok
                      ? <CheckCircle2 style={{ width: 13, height: 13, color: '#10B981', flexShrink: 0 }} />
                      : <XCircle     style={{ width: 13, height: 13, color: '#EF4444', flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 12, color: r.ok ? '#10B981' : '#EF4444' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <PassField
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />

            {confirm.length > 0 && (
              <p style={{ fontSize: 12, color: confirmOk ? '#10B981' : '#EF4444', margin: '-8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                {confirmOk
                  ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Passwords match</>
                  : <><XCircle     style={{ width: 13, height: 13 }} /> Passwords do not match</>
                }
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !allRulesOk || !confirmOk || !current}
              className="btn btn-primary"
              style={{ marginTop: 4, height: 42, width: '100%', opacity: (loading || !allRulesOk || !confirmOk || !current) ? 0.6 : 1 }}
            >
              {loading ? 'Changing Password…' : 'Set New Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
