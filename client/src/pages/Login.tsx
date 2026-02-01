import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/w';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate(next.startsWith('/') ? next : `/${next}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--app-bg)' }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{
          background: 'transparent',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'none',
        }}
      >
        <h1
          className="text-center text-xl font-bold"
          style={{ color: 'var(--black)', letterSpacing: '-0.02em', marginBottom: 8 }}
        >
          Kaynak
        </h1>
        <p className="text-center text-sm" style={{ color: 'var(--medium-gray)', marginBottom: 32 }}>
          Sign in to your account
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <p
              className="px-0 py-2 text-sm"
              style={{ borderBottom: '2px solid var(--accent-danger)', color: 'var(--accent-danger)', fontWeight: 500, background: 'transparent' }}
              role="alert"
            >
              {error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full" style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--medium-gray)' }}>
          No account?{' '}
          <Link to={next !== '/w' ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="link-accent">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
