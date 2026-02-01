import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { AppLayout } from './AppLayout';

/**
 * Resolves workspace from URL slug, sets it in store (and API header), then renders AppLayout.
 * Redirects to /w if workspace not found or user not a member.
 */
export function WorkspaceLayout() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { setCurrentBySlug } = useWorkspaceStore();
  const [resolved, setResolved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!workspaceSlug) {
      setResolved(true);
      setFailed(true);
      return;
    }
    setFailed(false);
    setResolved(false);
    setCurrentBySlug(workspaceSlug).then((ok) => {
      setResolved(true);
      if (!ok) setFailed(true);
    });
  }, [workspaceSlug, setCurrentBySlug]);

  if (!workspaceSlug || failed) {
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
