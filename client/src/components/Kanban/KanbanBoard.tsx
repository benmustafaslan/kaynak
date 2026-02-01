import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  BOARD_PIECE_STATES,
  BOARD_PIECE_STATE_LABELS,
  PIECE_WORKFLOW_COLORS,
  type Piece,
  type BoardPieceState,
} from '../../types/piece';
import { getPieceTypeDisplayLabel } from '../../utils/pieceTypesPreferences';
import { NewPieceModal } from './NewPieceModal';
import { PieceCard } from './PieceCard';
import { PiecesCalendarView } from './PiecesCalendarView';
import { piecesApi } from '../../utils/piecesApi';

function KanbanColumnHeader({ state, count }: { state: BoardPieceState; count: number }) {
  return (
    <div className="kanban-column-header">
      <div className="kanban-column-title">
        <span>{BOARD_PIECE_STATE_LABELS[state]}</span>
        <span className="kanban-column-count">{count}</span>
      </div>
    </div>
  );
}

type Filter = 'all' | 'mine';
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  mine: 'My pieces',
};

type ViewMode = 'kanban' | 'deadline' | 'calendar';
const VIEW_LABELS: Record<ViewMode, string> = {
  kanban: 'By stage',
  deadline: 'By deadline',
  calendar: 'Calendar',
};

export type KanbanBoardProps = {
  /** When provided (e.g. from Board page), filters and this content are shown in one row */
  toolbarRight?: React.ReactNode;
};

const VIEW_PARAM = 'view';

export function KanbanBoard({ toolbarRight }: KanbanBoardProps = {}) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewFromUrl = searchParams.get(VIEW_PARAM) as ViewMode | null;
  const viewMode: ViewMode =
    viewFromUrl && Object.keys(VIEW_LABELS).includes(viewFromUrl) ? viewFromUrl : 'kanban';
  const setViewMode = useCallback(
    (next: ViewMode | ((prev: ViewMode) => ViewMode)) => {
      const value = typeof next === 'function' ? next(viewMode) : next;
      const nextParams = new URLSearchParams(searchParams);
      if (value === 'kanban') nextParams.delete(VIEW_PARAM);
      else nextParams.set(VIEW_PARAM, value);
      setSearchParams(nextParams, { replace: true });
    },
    [viewMode, searchParams, setSearchParams]
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const filtersMenuRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<BoardPieceState | null>(null);
  const [activeSection, setActiveSection] = useState<BoardPieceState | null>(null);
  const [clickedSection, setClickedSection] = useState<BoardPieceState | null>(null);
  const [showNewPieceModal, setShowNewPieceModal] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skipActiveSectionUntilRef = useRef(0);

  useEffect(() => {
    if (!filtersMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersMenuRef.current && !filtersMenuRef.current.contains(e.target as Node)) setFiltersMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filtersMenuOpen]);

  useEffect(() => {
    if (!viewDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) setViewDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [viewDropdownOpen]);

  const fetchPieces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await piecesApi.listAll({
        myStories: filter === 'mine',
        ...(formatFilter ? { format: formatFilter } : {}),
      });
      setPieces(res.pieces);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pieces');
      setPieces([]);
    } finally {
      setLoading(false);
    }
  }, [filter, formatFilter]);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  useEffect(() => {
    const refs = sectionRefs.current;
    const states = Array.from(BOARD_PIECE_STATES);
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < skipActiveSectionUntilRef.current) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          const state = id?.replace('section-', '') as BoardPieceState;
          if (!state || !states.includes(state)) return;
          const isFirstState = state === states[0];
          const scrollTop = window.scrollY ?? document.documentElement.scrollTop;
          if (isFirstState && scrollTop < 80) {
            setActiveSection(null);
          } else {
            setActiveSection(state);
          }
        });
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    states.forEach((state) => {
      const el = refs[state];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pieces.length]);

  const handleStateBoxClick = useCallback((state: BoardPieceState) => {
    document.getElementById(`section-${state}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setClickedSection(state);
    setActiveSection(state);
    skipActiveSectionUntilRef.current = Date.now() + 1200;
    window.setTimeout(() => setClickedSection(null), 1200);
  }, []);

  const workflowStates = useMemo(() => BOARD_PIECE_STATES, []);

  const piecesByState = useMemo(() => {
    const map: Record<string, Piece[]> = {};
    workflowStates.forEach((state) => (map[state] = []));
    pieces.forEach((o) => {
      const s = (o.state || 'scripting').toLowerCase();
      if (map[s]) map[s].push(o);
    });
    return map;
  }, [pieces, workflowStates]);

  const formats = useMemo(() => {
    const set = new Set(pieces.map((o) => o.format));
    return Array.from(set).sort();
  }, [pieces]);

  /** For deadline view: pieces with deadline first (ascending), then no-deadline. */
  const piecesByDeadline = useMemo(() => {
    const withDeadline = pieces
      .filter((p) => p.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
    const noDeadline = pieces.filter((p) => !p.deadline);
    return { withDeadline, noDeadline };
  }, [pieces]);

  const handleDragStart = (_e: React.DragEvent, piece: Piece) => {
    setDraggingId(piece._id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, toState: BoardPieceState) => {
    e.preventDefault();
    setDragOverState(null);
    const pieceId = e.dataTransfer.getData('text/plain');
    const piece = pieces.find((o) => o._id === pieceId);
    if (!piece || (piece.state || 'scripting').toLowerCase() === toState) return;
    const previousState = (piece.state || 'scripting').toLowerCase();
    setPieces((prev) =>
      prev.map((o) => (o._id === pieceId ? { ...o, state: toState } : o))
    );
    setDraggingId(null);
    try {
      await piecesApi.update(pieceId, { state: toState });
    } catch (err) {
      setPieces((prev) =>
        prev.map((o) => (o._id === pieceId ? { ...o, state: previousState } : o))
      );
      setError(err instanceof Error ? err.message : 'Failed to move piece');
    }
  };

  const handleDragEnter = (_e: React.DragEvent, state: BoardPieceState) => {
    if (draggingId) setDragOverState(state);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverState(null);
  };

  if (loading && pieces.length === 0) {
    return (
      <div
        className="flex justify-center py-24"
        style={{ color: 'var(--medium-gray)', fontSize: 14 }}
      >
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--black)' }}
        />
        <span className="ml-3">Loading pieces…</span>
      </div>
    );
  }

  return (
    <>
      <div className="board-toolbar">
        <div className="board-filters-inner">
          <div className="board-filters-dropdown-wrap" ref={viewDropdownRef}>
            <button
              type="button"
              onClick={() => setViewDropdownOpen((o) => !o)}
              className="btn btn-secondary board-filter-btn"
              style={{ padding: '6px 12px', fontSize: 13 }}
              aria-label="View"
              aria-expanded={viewDropdownOpen}
            >
              {VIEW_LABELS[viewMode]} ▾
            </button>
            {viewDropdownOpen && (
              <div className="board-filters-menu" role="menu">
                {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="menuitem"
                    className={`board-filters-menu-item ${viewMode === v ? 'active' : ''}`}
                    onClick={() => {
                      setViewMode(v);
                      setViewDropdownOpen(false);
                    }}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
          <div className="board-filters-dropdown-wrap" ref={filtersMenuRef}>
            <button
              type="button"
              onClick={() => setFiltersMenuOpen((o) => !o)}
              className="btn btn-secondary board-filter-btn"
              style={{ padding: '6px 12px', fontSize: 13 }}
              aria-label="Filters"
              aria-expanded={filtersMenuOpen}
            >
              Filters
            </button>
            {filtersMenuOpen && (
              <div className="board-filters-menu" role="menu">
                <div className="board-filters-menu-item board-filters-menu-section">
                  Format
                </div>
                {formats.length > 0 ? (
                  <div className="board-filters-menu-tags">
                    <button
                      type="button"
                      role="menuitem"
                      className={`board-filters-menu-cat ${!formatFilter ? 'active' : ''}`}
                      onClick={() => setFormatFilter('')}
                    >
                      All
                    </button>
                    {formats.map((f) => (
                      <button
                        key={f}
                        type="button"
                        role="menuitem"
                        className={`board-filters-menu-cat ${formatFilter === f ? 'active' : ''}`}
                        onClick={() => setFormatFilter(formatFilter === f ? '' : f)}
                      >
                        {getPieceTypeDisplayLabel(f)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="board-filters-menu-empty">No formats yet</div>
                )}
              </div>
            )}
          </div>
          {formatFilter && (
            <button
              type="button"
              onClick={() => setFormatFilter('')}
              className="board-filters-tag-chip"
              aria-label={`Clear format filter: ${formatFilter}`}
            >
              <span className="board-filters-tag-chip-x" aria-hidden>×</span>
              <span>{getPieceTypeDisplayLabel(formatFilter)}</span>
            </button>
          )}
        </div>
        <div className="board-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowNewPieceModal(true)}
            className="btn btn-primary"
          >
            New piece
          </button>
          {toolbarRight}
        </div>
      </div>

      {showNewPieceModal && (
        <NewPieceModal
          onClose={() => setShowNewPieceModal(false)}
          onSubmit={async (data) => {
            await piecesApi.createStandalone({
              format: data.format,
              headline: data.headline,
              state: data.state,
              deadline: data.deadline ?? undefined,
            });
            await fetchPieces();
          }}
        />
      )}

      {error && (
        <div
          className="board-header"
          style={{ borderColor: 'var(--black)', paddingTop: 16, paddingBottom: 16 }}
        >
          <p style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {pieces.length === 0 && !loading ? (
        <div className="empty-state">
          <h3 className="empty-state-title">No pieces yet</h3>
          <p className="empty-state-description">
            Create a piece above (not linked to any story), or open a story in Stories and add a piece there.
          </p>
          <button
            type="button"
            onClick={() => setShowNewPieceModal(true)}
            className="btn btn-primary"
          >
            New piece
          </button>
          <Link to={`${basePath}/stories`} className="btn btn-ghost">
            Stories
          </Link>
        </div>
      ) : viewMode === 'calendar' ? (
        <PiecesCalendarView
          pieces={pieces}
          basePath={basePath}
          returnPath={`${basePath}/board?view=calendar`}
        />
      ) : viewMode === 'deadline' ? (
        <div className="deadline-view">
          <div className="deadline-view-sections">
            {piecesByDeadline.withDeadline.length > 0 && (
              <section className="deadline-view-section" aria-label="Pieces with deadline">
                <h3 className="deadline-view-section-title">By deadline</h3>
                <ul className="deadline-view-list">
                  {piecesByDeadline.withDeadline.map((piece) => (
                    <li key={piece._id} className="deadline-view-row">
                      <PieceCard
                        piece={piece}
                        isDragging={draggingId === piece._id}
                        onDragStart={handleDragStart}
                        variant="row"
                        showDeadline
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {piecesByDeadline.noDeadline.length > 0 && (
              <section className="deadline-view-section" aria-label="Pieces without deadline">
                <h3 className="deadline-view-section-title">No deadline</h3>
                <ul className="deadline-view-list">
                  {piecesByDeadline.noDeadline.map((piece) => (
                    <li key={piece._id} className="deadline-view-row">
                      <PieceCard
                        piece={piece}
                        isDragging={draggingId === piece._id}
                        onDragStart={handleDragStart}
                        variant="row"
                        showDeadline={false}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="kanban-container">
          <div className="kanban-state-boxes" aria-label="Workflow states">
            <div className="workflow-columns">
              {workflowStates.map((state, index) => {
                const count = piecesByState[state].length;
                const isDragOver = dragOverState === state;
                return (
                  <div
                    key={state}
                    className="workflow-column"
                    style={{ '--workflow-color': PIECE_WORKFLOW_COLORS[state] } as React.CSSProperties}
                  >
                    <div
                      className={`workflow-step workflow-step-${state} ${index === 0 ? 'first' : ''} ${index === workflowStates.length - 1 ? 'last' : ''} ${activeSection === state ? 'active' : ''} ${isDragOver ? 'drag-over' : ''} ${draggingId ? 'dragging' : ''}`}
                      aria-hidden
                    >
                      <div className="workflow-step-dot" aria-hidden />
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStateBoxClick(state)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStateBoxClick(state);
                        }
                      }}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, state)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, state)}
                      className={`state-box column-${state} ${isDragOver ? 'drag-over' : ''} ${clickedSection === state ? 'clicked' : ''} ${activeSection === state ? 'active' : ''}`}
                      aria-label={`${BOARD_PIECE_STATE_LABELS[state]} stage, ${count} pieces`}
                    >
                      <span className="state-box-title">{BOARD_PIECE_STATE_LABELS[state]}</span>
                      <div className="state-indicator">
                        <span>{count} {count === 1 ? 'Piece' : 'Pieces'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="kanban-board kanban-board-vertical" onDragEnd={handleDragEnd}>
            {workflowStates.map((state) => {
              const columnPieces = piecesByState[state];
              const isDragOver = dragOverState === state;
              return (
                <div
                  key={state}
                  ref={(el) => { sectionRefs.current[state] = el; }}
                  id={`section-${state}`}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, state)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, state)}
                  className={`kanban-state-section column-${state} ${isDragOver ? 'drag-over' : ''}`}
                >
                  <KanbanColumnHeader state={state} count={columnPieces.length} />
                  <div className="kanban-state-section-list">
                    {columnPieces.length === 0 ? (
                      <p className="kanban-column-empty">—</p>
                    ) : (
                      columnPieces.map((piece) => (
                        <div key={piece._id} className="kanban-state-section-row">
                          <PieceCard
                            piece={piece}
                            isDragging={draggingId === piece._id}
                            onDragStart={handleDragStart}
                            variant="row"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
