import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      await register(email, password, name);
      navigate('/board');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h1
          className="text-center text-xl font-bold"
          style={{ color: 'var(--black)', letterSpacing: '-0.02em', marginBottom: 8 }}
        >
          Kaynak
        </h1>
        <p className="text-center text-sm" style={{ color: 'var(--medium-gray)', marginBottom: 32 }}>
          Create your account
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <p
              className="px-3 py-2 text-sm rounded-lg"
              style={{ border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', fontWeight: 500, background: 'rgba(239, 68, 68, 0.08)' }}
              role="alert"
            >
              {error}
            </p>
          )}
          <div>
            <label htmlFor="name" className="form-label">Name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-input"
            />
          </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="form-input"
            />
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--medium-gray)' }}>At least 8 characters</p>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full" style={loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--medium-gray)' }}>
          Already have an account?{' '}
          <Link to="/login" className="link-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
