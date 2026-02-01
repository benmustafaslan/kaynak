import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { invitesApi } from '../utils/workspacesApi';

export default function WorkspacePicker() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { workspaces, loading, error, fetchWorkspaces, setCurrentBySlug } = useWorkspaceStore();
  const [inviteInput, setInviteInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = inviteInput.trim();
    if (!t) return;
    const rawToken = t.includes('token=') ? (() => {
      try {
        const u = new URL(t, window.location.origin);
        return u.searchParams.get('token') || t;
      } catch {
        return t;
      }
    })() : t;
    setJoining(true);
    setJoinError('');
    try {
      const res = await invitesApi.accept(rawToken);
      await fetchWorkspaces();
      await setCurrentBySlug(res.workspace.slug);
      navigate(`/w/${res.workspace.slug}/board`, { replace: true });
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Invalid or expired invite');
    } finally {
      setJoining(false);
    }
  };

  if (loading && workspaces.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <span className="text-sm" style={{ color: 'var(--medium-gray)' }}>Loading…</span>
      </div>
    );
  }

  const noWorkspaces = !loading && workspaces.length === 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col px-4 py-8" style={{ background: 'var(--app-bg)' }}>
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/w"
          onClick={(e) => {
            e.preventDefault();
            fetchWorkspaces();
          }}
          className="text-sm font-medium"
          style={{ color: 'var(--accent-primary)' }}
        >
          {workspaces.length > 0 ? 'My workspaces' : 'Refresh'}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium"
          style={{ color: 'var(--medium-gray)' }}
        >
          Log out
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-center text-xl font-bold" style={{ color: 'var(--black)', marginBottom: 8 }}>
          {noWorkspaces ? 'Get started' : 'Choose a workspace'}
        </h1>
        <p className="text-center text-sm" style={{ color: 'var(--medium-gray)', marginBottom: 24 }}>
          {noWorkspaces
            ? 'Create your first workspace or join one with an invite link.'
            : 'Select a workspace to continue, or create one.'}
        </p>
        {error && (
          <p className="mb-4 text-center text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
        )}

        {!noWorkspaces && (
          <ul className="mb-8 list-none space-y-2 p-0">
            {workspaces.map((w) => (
              <li key={w._id}>
                <button
                  type="button"
                  className="block w-full rounded-lg border px-4 py-3 text-left transition-colors hover:bg-black/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    setCurrentBySlug(w.slug).then((ok) => ok && navigate('/board', { replace: true }));
                  }}
                >
                  <span className="font-medium">{w.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium" style={{ color: 'var(--app-text-primary)' }}>
            Have an invite link?
          </h2>
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Paste invite link or token"
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)' }}
              disabled={joining}
            />
            {joinError && (
              <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{joinError}</p>
            )}
            <button
              type="submit"
              disabled={joining || !inviteInput.trim()}
              className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)' }}
            >
              {joining ? 'Joining…' : 'Join workspace'}
            </button>
          </form>
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            to="/w/create"
            className="rounded border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)' }}
          >
            Create a new workspace
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
