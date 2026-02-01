import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { invitesApi } from '../utils/workspacesApi';

/**
 * Accept workspace invite: token in ?token= or from pasted link.
 * If not logged in, redirect to login/register with next back here.
 */
export default function JoinByInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { setCurrentBySlug, fetchWorkspaces } = useWorkspaceStore();
  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [joining, setJoining] = useState(false);
  const [acceptingFromUrl, setAcceptingFromUrl] = useState(false);
  const [error, setError] = useState('');
  const acceptedRef = useRef(false);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!user) {
      const current = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(current)}`, { replace: true });
      return;
    }
    if (user && tokenFromUrl && !acceptedRef.current) {
      acceptedRef.current = true;
      setAcceptingFromUrl(true);
      setError('');
      invitesApi.accept(tokenFromUrl)
        .then(async (res) => {
          const { fetchWorkspaces: fetch, setCurrentBySlug: setCurrent } = useWorkspaceStore.getState();
          await fetch();
          await setCurrent(res.workspace.slug);
          navigate(`/w/${res.workspace.slug}/board`, { replace: true });
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Invalid or expired invite');
          setAcceptingFromUrl(false);
        });
    }
  }, [user, tokenFromUrl, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = token.trim();
    if (!t) {
      setError('Paste the invite link or token');
      return;
    }
    const rawToken = t.includes('token=') ? new URLSearchParams(new URL(t, window.location.origin).search).get('token') || t : t;
    setJoining(true);
    setError('');
    try {
      const res = await invitesApi.accept(rawToken);
      await fetchWorkspaces();
      await setCurrentBySlug(res.workspace.slug);
      navigate(`/w/${res.workspace.slug}/board`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired invite');
    } finally {
      setJoining(false);
    }
  };

  if (!user) {
    return null;
  }

  if (acceptingFromUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <span className="text-sm" style={{ color: 'var(--medium-gray)' }}>Joining workspace…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md">
        <h1 className="text-center text-xl font-bold" style={{ color: 'var(--black)', marginBottom: 8 }}>
          Join workspace
        </h1>
        <p className="text-center text-sm" style={{ color: 'var(--medium-gray)', marginBottom: 24 }}>
          Paste the invite link you received below.
        </p>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Invite link or token"
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
            disabled={joining}
          />
          {error && (
            <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={joining || !token.trim()}
            className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--accent-primary)' }}
          >
            {joining ? 'Joining…' : 'Join workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
