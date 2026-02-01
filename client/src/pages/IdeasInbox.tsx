import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { storiesApi } from '../utils/storiesApi';
import { piecesApi } from '../utils/piecesApi';
import { activityApi } from '../utils/activityApi';
import type { ActivityItemWithStory } from '../utils/activityApi';
import type { Story } from '../types/story';
import type { Piece } from '../types/piece';
import { IdeaCard, PieceIdeaCard, NewPieceIdeaModal, AssignmentModal, RejectModal, ParkModal } from '../components/IdeasInbox';
import type { AssignmentResult } from '../components/IdeasInbox/AssignmentModal';
import { NewStoryModal } from '../components/Kanban/NewStoryModal';
import { CreatePackageForm, PackageCard } from '../components/PackageSidebar';

const IDEAS_PAGE_SIZE = 20;

type SortOption = 'updatedAtDesc' | 'updatedAtAsc' | 'createdAtDesc' | 'createdAtAsc';

function canApproveIdeas(role: string | undefined): boolean {
  return role === 'chief_editor' || role === 'producer';
}

function formatActivityMessage(log: ActivityItemWithStory): string {
  const user = log.userId && typeof log.userId === 'object' ? (log.userId as { name?: string }).name : 'Someone';
  const story = log.storyId && typeof log.storyId === 'object' ? (log.storyId as { headline?: string }).headline : '';
  const details = log.details || {};
  switch (log.action) {
    case 'created':
      return `${user} created "${story}"`;
    case 'moved':
      return `${user} moved "${story}" from ${(details as { from?: string }).from || '?'} to ${(details as { to?: string }).to || '?'}`;
    case 'edited_script':
      return `${user} edited script of "${story}"`;
    case 'deleted':
      return `${user} deleted a story`;
    default:
      return `${user} — ${log.action}`;
  }
}

function activityDotClass(action: string): string {
  switch (action) {
    case 'moved':
      return 'pulse-dot scripting';
    case 'created':
      return 'pulse-dot research';
    case 'edited_script':
      return 'pulse-dot scripting';
    case 'deleted':
      return 'pulse-dot published';
    default:
      return 'pulse-dot research';
  }
}

export default function IdeasInbox() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [ideas, setIdeas] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortOption>('updatedAtDesc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentFor, setAssignmentFor] = useState<Story | null>(null);
  const [rejectFor, setRejectFor] = useState<Story | null>(null);
  const [parkFor, setParkFor] = useState<Story | null>(null);
  const [rejectForPiece, setRejectForPiece] = useState<Piece | null>(null);
  const [parkForPiece, setParkForPiece] = useState<Piece | null>(null);
  const [rejectForSeries, setRejectForSeries] = useState<Story | null>(null);
  const [parkForSeries, setParkForSeries] = useState<Story | null>(null);
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [showAddPiece, setShowAddPiece] = useState(false);
  const [ideasView, setIdeasView] = useState<'ideas' | 'series'>('ideas');

  const [series, setSeries] = useState<Story[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [, setCreatingSeries] = useState(false);

  const [pieceIdeas, setPieceIdeas] = useState<Piece[]>([]);

  const [activity, setActivity] = useState<ActivityItemWithStory[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storiesApi.list({
        approved: false,
        state: 'idea',
        page,
        limit: IDEAS_PAGE_SIZE,
        search: searchQuery || undefined,
        sort,
      });
      setIdeas(res.stories);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ideas');
      setIdeas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sort]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const fetchSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      const res = await storiesApi.list({ kind: 'parent', limit: 100 });
      setSeries(res.stories);
    } catch {
      setSeries([]);
    } finally {
      setSeriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ideasView === 'series') fetchSeries();
  }, [ideasView, fetchSeries]);

  const handleCreateSeries = useCallback(
    async (data: { headline: string; description: string }) => {
      setCreatingSeries(true);
      try {
        await storiesApi.create({
          headline: data.headline,
          description: data.description || 'Series',
          kind: 'parent',
        });
        setShowCreateSeries(false);
        await fetchSeries();
      } finally {
        setCreatingSeries(false);
      }
    },
    [fetchSeries]
  );

  const handleSeriesUpdated = useCallback((updated: Story) => {
    setSeries((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }, []);

  const handleSeriesDeleted = useCallback(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleStoryAdded = useCallback(() => {
    fetchSeries();
  }, [fetchSeries]);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await activityApi.getRecent(20);
      setActivity(res.activity);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const fetchPieceIdeas = useCallback(async () => {
    try {
      const res = await piecesApi.listAll({ standalone: true });
      setPieceIdeas(res.pieces);
    } catch {
      setPieceIdeas([]);
    }
  }, []);

  useEffect(() => {
    if (ideasView === 'ideas' && location.pathname === '/ideas') fetchPieceIdeas();
  }, [ideasView, location.pathname, fetchPieceIdeas]);

  const handleOpenStory = useCallback((idea: Story) => {
    navigate(`/story/${idea._id}`, { state: { from: '/ideas' } });
  }, [navigate]);

  const handleOpenPiece = useCallback((piece: Piece) => {
    navigate(`/piece/${piece._id}`, { state: { from: '/ideas' } });
  }, [navigate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const handleApprove = (idea: Story) => {
    setAssignmentFor(idea);
  };

  const handleApproveAsMine = async (idea: Story) => {
    if (!user) return;
    try {
      const now = new Date().toISOString();
      await storiesApi.update(idea._id, {
        approved: true,
        approvedBy: user._id,
        approvedAt: now,
        producer: user._id,
        editors: [],
      });
      await fetchIdeas();
      await fetchActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve as your story');
    }
  };

  const handleAssignmentConfirm = async (assignments: AssignmentResult) => {
    if (!assignmentFor || !user) return;
    try {
      const now = new Date().toISOString();
      await storiesApi.update(assignmentFor._id, {
        approved: true,
        approvedBy: user._id,
        approvedAt: now,
        producer: assignments.producer || undefined,
        editors: assignments.editors,
      });
      setAssignmentFor(null);
      await fetchIdeas();
      await fetchActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = (idea: Story) => setRejectFor(idea);
  const handleRejectConfirm = async (reason: string) => {
    if (rejectFor) {
      try {
        await storiesApi.update(rejectFor._id, {
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || undefined,
        });
        setRejectFor(null);
        await fetchIdeas();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject');
      }
      return;
    }
    if (rejectForPiece) {
      try {
        await piecesApi.update(rejectForPiece._id, {
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || undefined,
        });
        setRejectForPiece(null);
        await fetchPieceIdeas();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject');
      }
      return;
    }
    if (rejectForSeries) {
      try {
        await storiesApi.update(rejectForSeries._id, {
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || undefined,
        });
        setRejectForSeries(null);
        await fetchSeries();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject');
      }
    }
  };

  const handlePark = (idea: Story) => setParkFor(idea);
  const handleParkConfirm = async (date: Date) => {
    if (parkFor) {
      try {
        await storiesApi.update(parkFor._id, { parkedUntil: date.toISOString() });
        setParkFor(null);
        await fetchIdeas();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to park');
      }
      return;
    }
    if (parkForPiece) {
      try {
        await piecesApi.update(parkForPiece._id, { parkedUntil: date.toISOString() });
        setParkForPiece(null);
        await fetchPieceIdeas();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to park');
      }
      return;
    }
    if (parkForSeries) {
      try {
        await storiesApi.update(parkForSeries._id, { parkedUntil: date.toISOString() });
        setParkForSeries(null);
        await fetchSeries();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to park');
      }
    }
  };

  const handleRejectPiece = (piece: Piece) => setRejectForPiece(piece);
  const handleRejectPieceConfirm = async (reason: string) => {
    if (!rejectForPiece) return;
    try {
      await piecesApi.update(rejectForPiece._id, {
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || undefined,
      });
      setRejectForPiece(null);
      await fetchPieceIdeas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleParkPiece = (piece: Piece) => setParkForPiece(piece);

  const handleApprovePiece = async (piece: Piece) => {
    if (!user) return;
    try {
      await piecesApi.update(piece._id, {
        approved: true,
        approvedBy: user._id,
        approvedAt: new Date().toISOString(),
      });
      await fetchPieceIdeas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleAddIdea = async (data: {
    headline: string;
    description: string;
    categories: string[];
    parentStoryId?: string;
  }) => {
    await storiesApi.create({
      headline: data.headline,
      description: data.description,
      categories: data.categories,
      ...(data.parentStoryId ? { parentStoryId: data.parentStoryId } : {}),
    });
    setShowAddIdea(false);
    await fetchIdeas();
  };

  const canApprove = canApproveIdeas(user?.role);
  const totalPages = Math.max(1, Math.ceil(total / IDEAS_PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * IDEAS_PAGE_SIZE + 1;
  const end = Math.min(page * IDEAS_PAGE_SIZE, total);

  if (loading && ideas.length === 0 && page === 1) {
    return (
      <div className="ideas-inbox">
        <div className="flex items-center justify-center py-24" style={{ color: 'var(--medium-gray)', fontSize: 14 }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--black)' }} />
          <span className="ml-3">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="page-header agenda-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Agenda Tracking</h1>
          <p className="page-subtitle">Catch up with your team and the world. Ideas awaiting review · Series · Team pulse · World feed</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="agenda-view-tabs" role="tablist" aria-label="View">
            <button
              type="button"
              role="tab"
              aria-selected={ideasView === 'ideas'}
              className={`agenda-view-tab ${ideasView === 'ideas' ? 'active' : ''}`}
              onClick={() => setIdeasView('ideas')}
            >
              Ideas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ideasView === 'series'}
              className={`agenda-view-tab ${ideasView === 'series' ? 'active' : ''}`}
              onClick={() => setIdeasView('series')}
            >
              Series
            </button>
          </div>
          {ideasView === 'ideas' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => setShowAddIdea(true)} className="btn btn-primary">+ Add idea</button>
              <button type="button" onClick={() => setShowAddPiece(true)} className="btn btn-secondary">+ Add piece</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowCreateSeries(true)} className="btn btn-primary">+ New Series</button>
          )}
        </div>
      </header>

      <div className="ideas-inbox">
      {error && (
        <div className="board-header" style={{ borderColor: 'var(--black)', paddingTop: 16, paddingBottom: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <div className="agenda-layout">
        <div className="agenda-left">
          {ideasView === 'ideas' ? (
          <div className="agenda-card ideas-card">
            <div className="agenda-card-header">
              <span>Ideas awaiting review</span>
              <span className="badge">{total} idea{total !== 1 ? 's' : ''}</span>
            </div>
            <div className="ideas-toolbar">
              <form onSubmit={handleSearchSubmit} className="ideas-search-form">
                <input
                  type="search"
                  className="ideas-search"
                  placeholder="Search ideas…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search ideas"
                />
                <button type="submit" className="btn btn-ghost" style={{ padding: '8px 12px' }}>Search</button>
              </form>
              <select
                className="ideas-sort-select"
                value={sort}
                onChange={(e) => { setSort(e.target.value as SortOption); setPage(1); }}
                aria-label="Sort"
              >
                <option value="updatedAtDesc">Newest first</option>
                <option value="updatedAtAsc">Oldest first</option>
                <option value="createdAtDesc">Created (newest)</option>
                <option value="createdAtAsc">Created (oldest)</option>
              </select>
            </div>
            {loading ? (
              <div className="ideas-list-loading">Loading…</div>
            ) : ideas.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <h3 className="empty-state-title">No ideas found</h3>
                <p className="empty-state-description">
                  {searchQuery ? 'Try a different search or clear the filter.' : 'New story ideas will appear here for review. Add an idea to get started.'}
                </p>
                <button type="button" onClick={() => setShowAddIdea(true)} className="btn btn-primary">+ Add idea</button>
              </div>
            ) : (
              <>
                <div className="ideas-grid agenda-ideas-grid">
                  {ideas.map((idea) => (
                    <IdeaCard
                      key={`story-${idea._id}`}
                      idea={idea}
                      onOpen={handleOpenStory}
                      onApprove={handleApprove}
                      onApproveAsMine={handleApproveAsMine}
                      onReject={handleReject}
                      onPark={handlePark}
                      canApprove={canApprove}
                      isProducer={user?.role === 'producer'}
                    />
                  ))}
                  {pieceIdeas
                    .filter((p) => !p.rejectedAt)
                    .map((piece) => (
                      <PieceIdeaCard
                        key={`piece-${piece._id}`}
                        piece={piece}
                        onOpen={handleOpenPiece}
                        onReject={handleRejectPiece}
                        onPark={handleParkPiece}
                        onApprove={handleApprovePiece}
                        canApprove={canApprove}
                      />
                    ))}
                </div>
                <div className="pagination-bar">
                  <span className="pagination-info">Showing {start}–{end} of {total}</span>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Previous page"
                    >
                      ← Prev
                    </button>
                    <span className="page-numbers">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <button
                            key={p}
                            type="button"
                            className={`btn btn-ghost page-num ${p === page ? 'current' : ''}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Next page"
                    >
                      Next →
                    </button>
                  </div>
                </div>
                <div className="add-idea-bar" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setShowAddIdea(true)} className="btn btn-primary">+ Add idea</button>
                  <button type="button" onClick={() => setShowAddPiece(true)} className="btn btn-secondary">+ Add piece</button>
                </div>
              </>
            )}
          </div>
          ) : (
          <div className="agenda-card series-card">
            <div className="agenda-card-header">
              <span>Series</span>
              <span className="badge">{series.filter((s) => !s.rejectedAt).length} series</span>
            </div>
            {showCreateSeries ? (
              <div className="series-page-form-wrap" style={{ padding: 16 }}>
                <CreatePackageForm
                  onCancel={() => setShowCreateSeries(false)}
                  onSubmit={handleCreateSeries}
                />
              </div>
            ) : seriesLoading ? (
              <div className="ideas-list-loading">Loading…</div>
            ) : series.filter((s) => !s.rejectedAt).length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p className="empty-state-description">Create a series to group related stories. Rejected series appear in Archive.</p>
                <button type="button" onClick={() => setShowCreateSeries(true)} className="btn btn-primary">+ New Series</button>
              </div>
            ) : (
              <div className="series-page-list" style={{ padding: '0 16px 16px' }}>
                {series.filter((s) => !s.rejectedAt).map((pkg) => (
                  <PackageCard
                    key={pkg._id}
                    pkg={pkg}
                    onUpdated={handleSeriesUpdated}
                    onDeleted={handleSeriesDeleted}
                    onStoryAdded={handleStoryAdded}
                    onReject={handleRejectSeries}
                    onPark={handleParkSeries}
                    onApprove={handleApproveSeries}
                    canApprove={canApprove}
                  />
                ))}
              </div>
            )}
          </div>
          )}

          <div className="agenda-card team-pulse-card">
            <div className="agenda-card-header">Team pulse</div>
            {activityLoading ? (
              <div className="pulse-list-loading">Loading…</div>
            ) : activity.length === 0 ? (
              <div className="pulse-empty">No recent activity</div>
            ) : (
              <ul className="pulse-list">
                {activity.map((log) => (
                  <li key={log._id} className="pulse-item">
                    <span className={activityDotClass(log.action)} aria-hidden />
                    <span>{formatActivityMessage(log)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {assignmentFor && <AssignmentModal onClose={() => setAssignmentFor(null)} onConfirm={handleAssignmentConfirm} />}
      {(rejectFor || rejectForPiece || rejectForSeries) && (
        <RejectModal
          ideaHeadline={rejectFor?.headline ?? rejectForPiece?.headline ?? rejectForSeries?.headline ?? ''}
          onClose={() => { setRejectFor(null); setRejectForPiece(null); setRejectForSeries(null); }}
          onConfirm={handleRejectConfirm}
        />
      )}
      {(parkFor || parkForPiece || parkForSeries) && (
        <ParkModal
          ideaHeadline={parkFor?.headline ?? parkForPiece?.headline ?? parkForSeries?.headline ?? ''}
          onClose={() => { setParkFor(null); setParkForPiece(null); setParkForSeries(null); }}
          onConfirm={handleParkConfirm}
        />
      )}
      {showAddIdea && (
        <NewStoryModal onClose={() => setShowAddIdea(false)} onSubmit={handleAddIdea} title="New Idea" submitLabel="Add idea" isIdea />
      )}
      {showAddPiece && (
        <NewPieceIdeaModal
          onClose={() => setShowAddPiece(false)}
          onCreated={() => { fetchPieceIdeas(); }}
        />
      )}
      </div>
    </>
  );
}
