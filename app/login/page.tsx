'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast.success('Welcome back!');
      router.push('/');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 rounded-2xl overflow-hidden shadow-md" style={{ width: 72, height: 72 }}>
            <Image src="/logo.jpg" alt="B4U Logo" width={72} height={72} style={{ objectFit: 'cover' }} />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #92400E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            B4Utaskmanagement
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px 28px 24px' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute"
                  style={{
                    right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, color: 'var(--text-placeholder)',
                  }}
                >
                  {showPass
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 4, height: 40, width: '100%' }}
            >
              {loading ? (
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.7s linear infinite' }} />
              ) : 'Sign In'}
            </button>
          </form>

        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Need an account? Contact your admin.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
