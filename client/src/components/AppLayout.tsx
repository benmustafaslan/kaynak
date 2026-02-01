import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { storiesApi } from '../utils/storiesApi';
import { workspacesApi } from '../utils/workspacesApi';
import { piecesApi } from '../utils/piecesApi';
import { StoryDetailModal } from './StoryDetailModal';
import { PieceDetailModal } from './PieceDetailModal';
import { NewStoryModal } from './Kanban/NewStoryModal';
import { NewPieceModal } from './Kanban/NewPieceModal';

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

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

function IconInvite() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
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

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconCopyLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const { current: workspace, workspaces, fetchWorkspaces, setCurrentBySlug } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  const storyMatchWithSlug = useMatch('/w/:workspaceSlug/story/:id');
  const storyMatchSlugless = useMatch('/story/:id');
  const storyId = storyMatchWithSlug?.params?.id ?? storyMatchSlugless?.params?.id;
  const pieceMatchWithSlug = useMatch('/w/:workspaceSlug/piece/:id');
  const pieceMatchSlugless = useMatch('/piece/:id');
  const pieceId = pieceMatchWithSlug?.params?.id ?? pieceMatchSlugless?.params?.id;
  const [unapprovedCount, setUnapprovedCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteFetching, setInviteFetching] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('editor');
  const [copied, setCopied] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [createModal, setCreateModal] = useState<'story' | 'piece' | 'idea' | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const fromPath = (location.state as { from?: string })?.from ?? `${basePath}/board`;

  const closeStoryModal = () => {
    navigate(fromPath, { replace: true });
  };

  const closePieceModal = () => {
    navigate(fromPath, { replace: true });
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

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

  const isDashboard = location.pathname === `${basePath}/dashboard` && !storyId && !pieceId;
  const isBoard = location.pathname === `${basePath}/board` && !storyId && !pieceId;
  const isStories = location.pathname === `${basePath}/stories` && !storyId && !pieceId;
  const isIdeas = location.pathname === `${basePath}/ideas` && !storyId && !pieceId;
  const isPreferences = location.pathname === `${basePath}/preferences`;

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setWorkspaceSwitcherOpen(false);
  };

  const canInvite = !!workspace?._id;

  const handleGenerateInvite = async () => {
    if (!workspace?._id) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await workspacesApi.createInvite(workspace._id, inviteRole);
      setInviteLink(res.inviteLink);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const startNewInvite = () => {
    setInviteLink(null);
    setInviteError(null);
  };

  const handleCopyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!inviteModalOpen || !workspace?._id) return;
    setInviteFetching(true);
    setInviteError(null);
    workspacesApi
      .getInvite(workspace._id)
      .then((data) => {
        setInviteLink(data.inviteLink);
        setInviteRole(data.role as 'owner' | 'admin' | 'editor' | 'viewer');
      })
      .catch(() => {
        setInviteLink(null);
      })
      .finally(() => setInviteFetching(false));
  }, [inviteModalOpen, workspace?._id, canInvite]);

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setInviteLink(null);
    setInviteError(null);
    setInviteRole('editor');
    setCopied(false);
  };

  useEffect(() => {
    if (!fabMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fabMenuOpen]);

  const openCreateModal = (type: 'story' | 'piece' | 'idea') => {
    setFabMenuOpen(false);
    setCreateModal(type);
  };

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
        <div className="relative mb-4 mx-3">
          <button
            type="button"
            onClick={() => setWorkspaceSwitcherOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-medium hover:bg-black/5"
            style={{ color: 'var(--app-text-primary)', border: '1px solid var(--border)' }}
            aria-expanded={workspaceSwitcherOpen}
            aria-haspopup="true"
          >
            <span className="truncate">{workspace?.name ?? 'Workspace'}</span>
            <IconChevronDown />
          </button>
          {workspaceSwitcherOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setWorkspaceSwitcherOpen(false)} />
              <ul
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 list-none overflow-auto rounded border p-1 shadow-lg"
                style={{ background: 'var(--app-bg)', borderColor: 'var(--border)' }}
                role="menu"
              >
                {workspaces.map((w) => (
                  <li key={w._id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full truncate rounded px-3 py-2 text-left text-sm hover:bg-black/5"
                      style={{ color: 'var(--app-text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        closeMobileMenu();
                        setCurrentBySlug(w.slug).then((ok) => ok && navigate('/board'));
                      }}
                    >
                      {w.name}
                    </button>
                  </li>
                ))}
                <li role="none">
                  <Link
                    to="/w"
                    role="menuitem"
                    className="block rounded px-3 py-2 text-sm"
                    style={{ color: 'var(--accent-primary)' }}
                    onClick={closeMobileMenu}
                  >
                    Switch workspace…
                  </Link>
                </li>
              </ul>
            </>
          )}
        </div>
        <nav className="app-sidebar-nav">
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <Link
              to={`${basePath}/dashboard`}
              className={`app-sidebar-link ${isDashboard ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <IconDashboard />
              <span className="app-sidebar-link-text">Dashboard</span>
            </Link>
            <Link
              to={`${basePath}/stories`}
              className={`app-sidebar-link ${isStories ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <IconSeries />
              <span className="app-sidebar-link-text">Stories</span>
            </Link>
            <Link
              to={`${basePath}/board`}
              className={`app-sidebar-link ${isBoard ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <IconBoard />
              <span className="app-sidebar-link-text">Pieces</span>
            </Link>
            <Link
              to={`${basePath}/ideas`}
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
          </div>
          <div className="mt-auto flex flex-col gap-1">
            <Link
              to={`${basePath}/archive`}
              className={`app-sidebar-link ${location.pathname === `${basePath}/archive` ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <IconArchive />
              <span className="app-sidebar-link-text">Archive</span>
            </Link>
            {canInvite && (
              <button
                type="button"
                className="app-sidebar-link"
                style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => { setInviteModalOpen(true); closeMobileMenu(); }}
              >
                <IconInvite />
                <span className="app-sidebar-link-text">Add Members</span>
              </button>
            )}
            <Link
              to={`${basePath}/preferences`}
              className={`app-sidebar-link ${isPreferences ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <IconPreferences />
              <span className="app-sidebar-link-text">Preferences</span>
            </Link>
          </div>
        </nav>

        <div className="app-sidebar-footer">
          <a href="#" className="app-sidebar-link">Feedback</a>
          <a href="#" className="app-sidebar-link">Help Center</a>
          <span className="app-sidebar-user" title={user?.email}>
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              useWorkspaceStore.getState().clear();
              logout();
            }}
            className="app-sidebar-link app-sidebar-signout"
          >
            Sign out
          </button>
        </div>
      </aside>

      {inviteModalOpen && (
        <>
          <div className="fixed inset-0 z-[1200] bg-black/40" aria-hidden onClick={closeInviteModal} />
          <div
            className="fixed left-1/2 top-1/2 z-[1201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg"
            style={{ background: 'var(--app-bg)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="invite-modal-title"
          >
            <h2 id="invite-modal-title" className="mb-4 text-lg font-semibold" style={{ color: 'var(--app-text-primary)' }}>
              Add members to this workspace
            </h2>
            {inviteError && (
              <p className="mb-3 text-sm" style={{ color: 'var(--accent-danger)' }}>{inviteError}</p>
            )}

            <section className="mb-4" aria-labelledby="invite-link-heading">
              <h3 id="invite-link-heading" className="mb-2 text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                Invite link
              </h3>
              {inviteFetching ? (
                <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>Loading…</p>
              ) : inviteLink ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'var(--app-bg)' }}
                    aria-label="Invite link"
                  />
                  <button
                    type="button"
                    className="flex shrink-0 items-center justify-center rounded border p-2 transition-opacity hover:opacity-80"
                    style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)' }}
                    onClick={handleCopyInvite}
                    aria-label={copied ? 'Copied' : 'Copy link'}
                    title={copied ? 'Copied!' : 'Copy link'}
                  >
                    <IconCopyLink />
                    {copied && <span className="sr-only">Copied</span>}
                  </button>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>No invite link yet. Generate one below.</p>
              )}
            </section>

            {!inviteLink && !inviteFetching && canInvite && (
              <>
                <div className="mb-4">
                  <label htmlFor="invite-role" className="mb-2 block text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                    Role for new member
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'owner' | 'admin' | 'editor' | 'viewer')}
                    className="w-full rounded border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'var(--app-bg)' }}
                  >
                    {workspace?.role === 'owner' && <option value="owner">Owner</option>}
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="button"
                  disabled={inviteLoading}
                  className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={handleGenerateInvite}
                >
                  {inviteLoading ? 'Generating…' : 'Generate invite link'}
                </button>
              </>
            )}

            {inviteLink && canInvite && (
              <button
                type="button"
                className="text-sm font-medium"
                style={{ color: 'var(--accent-primary)' }}
                onClick={startNewInvite}
              >
                Generate new link
              </button>
            )}
            <button
              type="button"
              className="mt-4 text-sm font-medium"
              style={{ color: 'var(--accent-primary)' }}
              onClick={closeInviteModal}
            >
              Close
            </button>
          </div>
        </>
      )}

      <div ref={fabRef} className="fixed bottom-6 right-6 z-[1100] flex flex-col items-end gap-2">
        {fabMenuOpen && (
          <div
            className="flex flex-col rounded-lg border py-1 shadow-lg"
            style={{ background: 'var(--app-bg)', borderColor: 'var(--border)' }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium hover:bg-black/10"
              style={{ color: 'var(--app-text-primary)' }}
              onClick={() => openCreateModal('story')}
            >
              Create Story
            </button>
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium hover:bg-black/10"
              style={{ color: 'var(--app-text-primary)' }}
              onClick={() => openCreateModal('piece')}
            >
              Create Piece
            </button>
            <button
              type="button"
              role="menuitem"
              className="whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium hover:bg-black/10"
              style={{ color: 'var(--app-text-primary)' }}
              onClick={() => openCreateModal('idea')}
            >
              Save an Idea
            </button>
          </div>
        )}
        <button
          type="button"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]"
          style={{ background: 'var(--accent-primary)', color: 'white', boxShadow: 'var(--shadow-lg)' }}
          onClick={() => setFabMenuOpen((open) => !open)}
          aria-label={fabMenuOpen ? 'Close create menu' : 'Create'}
          aria-expanded={fabMenuOpen}
          aria-haspopup="true"
        >
          <IconPlus />
        </button>
      </div>

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
        {children}
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

      {createModal === 'story' && (
        <NewStoryModal
          onClose={() => setCreateModal(null)}
          onSubmit={async (data) => {
            await storiesApi.create({
              headline: data.headline,
              description: data.description,
              categories: data.categories,
              ...(data.state ? { state: data.state } : {}),
              ...(data.parentStoryId ? { parentStoryId: data.parentStoryId } : {}),
            });
            setCreateModal(null);
          }}
        />
      )}
      {createModal === 'piece' && (
        <NewPieceModal
          onClose={() => setCreateModal(null)}
          onSubmit={async (data) => {
            await piecesApi.createStandalone({
              format: data.format,
              headline: data.headline,
              state: data.state ?? 'scripting',
            });
            setCreateModal(null);
          }}
        />
      )}
      {createModal === 'idea' && (
        <NewStoryModal
          title="New Idea"
          submitLabel="Add idea"
          isIdea
          onClose={() => setCreateModal(null)}
          onSubmit={async (data) => {
            await storiesApi.create({
              headline: data.headline,
              description: data.description,
              categories: data.categories,
              ...(data.state ? { state: data.state } : {}),
              ...(data.parentStoryId ? { parentStoryId: data.parentStoryId } : {}),
            });
            setCreateModal(null);
          }}
        />
      )}
    </div>
  );
}
