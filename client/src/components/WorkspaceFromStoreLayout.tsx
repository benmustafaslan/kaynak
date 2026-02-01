import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWorkspaceStore, getLastWorkspaceSlug } from '../stores/workspaceStore';
import { AppLayout } from './AppLayout';

/**
 * Resolves workspace from store or last-used slug in localStorage (no workspace in URL).
 * Redirects to /w if no workspace can be resolved.
 */
export function WorkspaceFromStoreLayout() {
  const { current, setCurrentBySlug } = useWorkspaceStore();
  const [resolved, setResolved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (current) {
      setResolved(true);
      setFailed(false);
      return;
    }
    setResolved(false);
    setFailed(false);
    const lastSlug = getLastWorkspaceSlug();
    if (!lastSlug) {
      setResolved(true);
      setFailed(true);
      return;
    }
    setCurrentBySlug(lastSlug).then((ok) => {
      setResolved(true);
      if (!ok) setFailed(true);
    });
  }, [current, setCurrentBySlug]);

  if (failed) {
    return <Navigate to="/w" replace />;
  }
  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <span className="text-sm" style={{ color: 'var(--medium-gray)' }}>Loading workspace…</span>
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
