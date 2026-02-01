import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkspacePicker from './pages/WorkspacePicker';
import CreateWorkspace from './pages/CreateWorkspace';
import JoinByInvite from './pages/JoinByInvite';
import Board from './pages/Board';
import Stories from './pages/Stories';
import IdeasInbox from './pages/IdeasInbox';
import Archive from './pages/Archive';
import Preferences from './pages/Preferences';
import { WorkspaceLayout } from './components/WorkspaceLayout';

const LoadingScreen = () => (
  <div
    className="flex min-h-screen items-center justify-center"
    style={{ background: 'var(--app-bg)', color: 'var(--medium-gray)', fontSize: 14 }}
  >
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-transparent"
      style={{ borderTopColor: 'var(--accent-primary)' }}
    />
    <span className="ml-3">Loading…</span>
  </div>
);

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);
  const checked = useAuthStore((s) => s.checked);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    const unsub = persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (persist.hasHydrated()) {
      setHydrated(true);
    }
    const fallback = setTimeout(() => setHydrated(true), 3000);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (hydrated) fetchMe();
  }, [hydrated, fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/w"
          element={
            checked ? (
              user ? <WorkspacePicker /> : <Navigate to="/login" replace />
            ) : (
              <LoadingScreen />
            )
          }
        />
        <Route path="/w/create" element={checked ? (user ? <CreateWorkspace /> : <Navigate to="/login" replace />) : <LoadingScreen />} />
        <Route path="/w/join" element={checked ? <JoinByInvite /> : <LoadingScreen />} />
        <Route
          path="/w/:workspaceSlug"
          element={
            checked ? (
              user ? <WorkspaceLayout /> : <Navigate to="/login" replace />
            ) : (
              <LoadingScreen />
            )
          }
        >
          <Route index element={<Navigate to="board" replace />} />
          <Route path="board" element={<Board />} />
          <Route path="stories" element={<Stories />} />
          <Route path="ideas" element={<IdeasInbox />} />
          <Route path="archive" element={<Archive />} />
          <Route path="preferences" element={<Preferences />} />
          <Route path="story/:id" element={null} />
          <Route path="piece/:id" element={null} />
        </Route>
        <Route path="/" element={<Navigate to="/w" replace />} />
        <Route path="*" element={<Navigate to="/w" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
