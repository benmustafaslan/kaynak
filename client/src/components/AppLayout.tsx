import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { storiesApi } from '../utils/storiesApi';
import { StoryDetailModal } from './StoryDetailModal';
import { PieceDetailModal } from './PieceDetailModal';
import Board from '../pages/Board';
import Stories from '../pages/Stories';
import IdeasInbox from '../pages/IdeasInbox';

function IconBoard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconSeries() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  );
}

function IconPreferences() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const storyMatch = useMatch('/story/:id');
  const storyId = storyMatch?.params?.id;
  const pieceMatch = useMatch('/piece/:id');
  const pieceId = pieceMatch?.params?.id;
  const [unapprovedCount, setUnapprovedCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fromPath = (location.state as { from?: string })?.from ?? '/board';

  const closeStoryModal = () => {
    navigate(fromPath, { replace: true });
  };

  const closePieceModal = () => {
    navigate(fromPath, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    storiesApi
      .list({ approved: false, state: 'idea', limit: 1 })
      .then((res) => {
        if (!cancelled) setUnapprovedCount(res.total);
      })
      .catch(() => {
        if (!cancelled) setUnapprovedCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const isBoard = location.pathname === '/board' && !storyId && !pieceId;
  const isStories = location.pathname === '/stories' && !storyId && !pieceId;
  const isIdeas = location.pathname === '/ideas' && !storyId && !pieceId;
  const isPreferences = location.pathname === '/preferences';

  // Render Board/Stories/Ideas when on that route OR when the story/piece modal was opened from that page
  // (keeps the same component instance when closing the modal). Use Outlet only for other routes.
  const showBoard = location.pathname === '/board' || ((storyId || pieceId) && fromPath === '/board');
  const showStories = location.pathname === '/stories' || ((storyId || pieceId) && fromPath === '/stories');
  const showIdeasPage = location.pathname === '/ideas' || ((storyId || pieceId) && fromPath === '/ideas');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      {mobileMenuOpen && (
        <button
          type="button"
          className="app-sidebar-overlay"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`app-sidebar ${mobileMenuOpen ? 'app-sidebar-mobile-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="app-sidebar-nav">
          <Link
            to="/stories"
            className={`app-sidebar-link ${isStories ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <IconSeries />
            <span className="app-sidebar-link-text">Stories</span>
          </Link>
          <Link
            to="/board"
            className={`app-sidebar-link ${isBoard ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <IconBoard />
            <span className="app-sidebar-link-text">Pieces</span>
          </Link>
          <Link
            to="/ideas"
            className={`app-sidebar-link ${isIdeas ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <IconInbox />
            <span className="app-sidebar-link-text">Agenda Tracking</span>
            {unapprovedCount > 0 && (
              <span className="nav-badge" aria-label={`${unapprovedCount} ideas awaiting review`}>
                {unapprovedCount}
              </span>
            )}
          </Link>
          <Link
            to="/archive"
            className={`app-sidebar-link ${location.pathname === '/archive' ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <IconArchive />
            <span className="app-sidebar-link-text">Archive</span>
          </Link>
          <Link
            to="/preferences"
            className={`app-sidebar-link ${isPreferences ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <IconPreferences />
            <span className="app-sidebar-link-text">Preferences</span>
          </Link>
        </nav>

        <div className="app-sidebar-footer">
          <a href="#" className="app-sidebar-link">Feedback</a>
          <a href="#" className="app-sidebar-link">Help Center</a>
          <span className="app-sidebar-user" title={user?.email}>
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => { closeMobileMenu(); logout(); }}
            className="app-sidebar-link app-sidebar-signout"
          >
            Sign out
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="app-sidebar-menu-btn"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <IconClose /> : <IconMenu />}
      </button>

      <main className="app-main">
        {showBoard ? (
          <Board />
        ) : showStories ? (
          <Stories />
        ) : showIdeasPage ? (
          <IdeasInbox />
        ) : (
          <Outlet />
        )}
      </main>
      {storyId && (
        <StoryDetailModal
          storyId={storyId}
          onClose={closeStoryModal}
        />
      )}
      {pieceId && (
        <PieceDetailModal
          pieceId={pieceId}
          onClose={closePieceModal}
        />
      )}
    </div>
  );
}
