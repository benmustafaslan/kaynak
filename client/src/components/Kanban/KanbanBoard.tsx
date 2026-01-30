import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BOARD_WORKFLOW_STATES, getBoardStateDisplayLabel, WORKFLOW_STAGE_BAR_COLORS, type Story, type StoryState } from '../../types/story';
import { StoryCard } from './StoryCard';
import { NewStoryModal } from './NewStoryModal';
import { WorkflowMetrics } from './WorkflowMetrics';
import { isOverdue } from './workflowUtils';
import { useAuthStore } from '../../stores/authStore';
import { storiesApi } from '../../utils/storiesApi';

function KanbanColumnHeader({
  state,
  count,
}: {
  state: StoryState;
  count: number;
}) {
  return (
    <div className="kanban-column-header">
      <div className="kanban-column-title">
        <span>{getBoardStateDisplayLabel(state)}</span>
        <span className="kanban-column-count">{count}</span>
      </div>
    </div>
  );
}

type Filter = 'all' | 'mine';
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  mine: 'My Stories',
};

export type KanbanBoardProps = {
  controlledShowNewStory?: boolean;
  controlledShowNewPackage?: boolean;
  onCloseNewStory?: () => void;
  /** Called when user requests to open the new story modal (e.g. from state box "+ Add story"). Parent should set controlledShowNewStory to true. */
  onRequestNewStory?: () => void;
  /** When provided (e.g. from Board page), filters and this content are shown in one row, vertically centered */
  toolbarRight?: React.ReactNode;
};

export function KanbanBoard({ controlledShowNewStory, controlledShowNewPackage, onCloseNewStory, onRequestNewStory, toolbarRight }: KanbanBoardProps = {}) {
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?._id ?? '';

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const filtersMenuRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<StoryState | null>(null);
  const [showNewStory, setShowNewStory] = useState(false);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [newStoryInitialState, setNewStoryInitialState] = useState<StoryState | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<StoryState | null>(null);
  const [clickedSection, setClickedSection] = useState<StoryState | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skipActiveSectionUntilRef = useRef(0);

  const effectiveShowNewStory = controlledShowNewStory ?? showNewStory;
  const effectiveShowNewPackage = controlledShowNewPackage ?? showNewPackage;
  const renderNewStoryButton = onCloseNewStory == null;

  useEffect(() => {
    if (!newMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setNewMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [newMenuOpen]);

  useEffect(() => {
    if (!filtersMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersMenuRef.current && !filtersMenuRef.current.contains(e.target as Node)) setFiltersMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filtersMenuOpen]);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams: {
        myStories?: boolean;
        overdue?: boolean;
        category?: string;
        search?: string;
        approved?: boolean;
        stateNe?: string;
        state?: string;
        limit?: number;
      } = {};
      if (filter === 'mine') baseParams.myStories = true;
      if (overdueOnly) baseParams.overdue = true;
      if (categoryFilter) baseParams.category = categoryFilter;
      if (search.trim()) baseParams.search = search.trim();

      const workflowRes = await storiesApi.list({ ...baseParams, approved: true, stateNe: 'idea' });
      setStories(workflowRes.stories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stories');
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search, overdueOnly, categoryFilter]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    const refs = sectionRefs.current;
    const states = Array.from(BOARD_WORKFLOW_STATES);
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < skipActiveSectionUntilRef.current) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          const state = id?.replace('section-', '') as StoryState;
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
  }, [stories.length]);

  const handleStateBoxClick = useCallback((state: StoryState) => {
    document.getElementById(`section-${state}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setClickedSection(state);
    setActiveSection(state);
    skipActiveSectionUntilRef.current = Date.now() + 1200;
    window.setTimeout(() => setClickedSection(null), 1200);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => s.categories?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [stories]);

  const workflowStates = useMemo(() => BOARD_WORKFLOW_STATES, []);

  const storiesByState = useMemo(() => {
    const map: Record<string, Story[]> = {};
    workflowStates.forEach((state) => (map[state] = []));
    stories.forEach((s) => {
      if (map[s.state]) map[s.state].push(s);
    });
    return map;
  }, [stories, workflowStates]);

  const fallingBehindByState = useMemo(() => {
    const map: Record<string, number> = {};
    workflowStates.forEach((state) => (map[state] = 0));
    stories.forEach((s) => {
      if (map[s.state] != null && isOverdue(s)) map[s.state] += 1;
    });
    return map;
  }, [stories, workflowStates]);

  const handleDragStart = (_e: React.DragEvent, story: Story) => {
    setDraggingId(story._id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, toState: StoryState) => {
    e.preventDefault();
    setDragOverState(null);
    const id = e.dataTransfer.getData('text/plain');
    const story = stories.find((s) => s._id === id);
    if (!story || story.state === toState) return;
    const previousState = story.state;
    setStories((prev) =>
      prev.map((s) => (s._id === story._id ? { ...s, state: toState } : s))
    );
    setDraggingId(null);
    try {
      await storiesApi.update(story._id, { state: toState });
    } catch (err) {
      setStories((prev) =>
        prev.map((s) => (s._id === story._id ? { ...s, state: previousState } : s))
      );
      setError(err instanceof Error ? err.message : 'Failed to move story');
    }
  };

  const handleDragEnter = (_e: React.DragEvent, state: StoryState) => {
    if (draggingId) setDragOverState(state);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverState(null);
  };

  const handleCloseNewStory = useCallback(() => {
    setShowNewStory(false);
    setShowNewPackage(false);
    setNewStoryInitialState(null);
    onCloseNewStory?.();
  }, [onCloseNewStory]);

  const handleCreateStory = async (data: {
    headline: string;
    description: string;
    categories: string[];
    state?: StoryState;
    kind?: 'story' | 'parent';
    parentStoryId?: string;
  }) => {
    await storiesApi.create({
      headline: data.headline,
      description: data.description,
      categories: data.categories,
      ...(data.state && data.state !== 'idea' ? { state: data.state } : {}),
      ...(data.kind ? { kind: data.kind } : {}),
      ...(data.parentStoryId ? { parentStoryId: data.parentStoryId } : {}),
    });
    setNewStoryInitialState(null);
    onCloseNewStory?.();
    await fetchStories();
  };

  const openNewStoryInState = (state: StoryState) => {
    setNewStoryInitialState(state);
    setShowNewStory(true);
    onRequestNewStory?.();
  };

  if (loading && stories.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-24"
        style={{ color: 'var(--medium-gray)', fontSize: 14 }}
      >
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--black)' }}
        />
        <span className="ml-3">Loading stories…</span>
      </div>
    );
  }

  return (
    <>
      <div className={toolbarRight ? 'board-toolbar' : 'board-filters'}>
        <div className="board-filters-inner">
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
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={overdueOnly}
                  className="board-filters-menu-item"
                  onClick={() => setOverdueOnly((o) => !o)}
                >
                  Overdue Projects
                  {overdueOnly && <span className="board-filters-menu-check" aria-hidden>✓</span>}
                </button>
                <div className="board-filters-menu-item board-filters-menu-section">
                  Search by category
                </div>
                {categories.length > 0 ? (
                  <div className="board-filters-menu-categories">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="menuitem"
                        className={`board-filters-menu-cat ${categoryFilter === c ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="board-filters-menu-empty">No categories yet</div>
                )}
              </div>
            )}
          </div>
          {categoryFilter && (
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className="board-filters-category-chip"
              aria-label={`Clear category filter: ${categoryFilter}`}
            >
              <span className="board-filters-category-chip-x" aria-hidden>×</span>
              <span>{categoryFilter}</span>
            </button>
          )}
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input board-filters-search"
            style={{ minWidth: 140, maxWidth: 200, padding: '6px 10px', fontSize: 13 }}
          />
        </div>
        {toolbarRight && <div className="board-toolbar-right">{toolbarRight}</div>}
      </div>

      {renderNewStoryButton && (
        <div className="board-new-story-corner" ref={newMenuRef}>
          <div className="board-new-story-split">
            <button
              type="button"
              onClick={() => { setNewMenuOpen(false); setShowNewPackage(false); setShowNewStory(true); }}
              className="btn btn-primary"
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            >
              + New Story
            </button>
            <button
              type="button"
              onClick={() => setNewMenuOpen((o) => !o)}
              className="btn btn-primary board-new-story-toggle"
              aria-label="More create options"
              aria-expanded={newMenuOpen}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '5px solid currentColor',
                  verticalAlign: 'middle',
                  transform: newMenuOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>
          </div>
          {newMenuOpen && (
            <div className="board-new-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: 14 }}
                onClick={() => { setNewMenuOpen(false); setShowNewPackage(false); setShowNewStory(true); }}
              >
                New Story
              </button>
              <button
                type="button"
                role="menuitem"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: 14 }}
                onClick={() => { setNewMenuOpen(false); setShowNewPackage(true); setShowNewStory(true); }}
              >
                New Series
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className="board-header"
          style={{ borderColor: 'var(--black)', paddingTop: 16, paddingBottom: 16 }}
        >
          <p style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <WorkflowMetrics stories={stories} />

      {stories.length === 0 && !loading ? (
        <div className="empty-state">
          <h3 className="empty-state-title">No stories yet</h3>
          <p className="empty-state-description">
            Create your first story to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowNewStory(true)}
            className="btn btn-primary"
          >
            + New Story
          </button>
        </div>
      ) : (
        <div className="kanban-container">
          <div className="kanban-state-boxes" aria-label="Workflow states">
            <div className="workflow-columns">
              {workflowStates.map((state, index) => {
                const count = storiesByState[state].length;
                const fallingBehind = fallingBehindByState[state] ?? 0;
                const isDragOver = dragOverState === state;
                return (
                  <div
                    key={state}
                    className="workflow-column"
                    style={{ '--workflow-color': WORKFLOW_STAGE_BAR_COLORS[state] } as React.CSSProperties}
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
                      aria-label={`${getBoardStateDisplayLabel(state)} stage, ${count} stories`}
                    >
                      <span className="state-box-title">{getBoardStateDisplayLabel(state)}</span>
                      <div className="state-indicator">
                        <span>{count} {count === 1 ? 'Story' : 'Stories'}</span>
                        {fallingBehind > 0 && (
                          <span className="state-indicator-falling">{fallingBehind} Falling Behind</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewStoryInState(state);
                        }}
                        className="state-box-add"
                        aria-label={`Add story in ${getBoardStateDisplayLabel(state)}`}
                      >
                        + Add story
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="kanban-board kanban-board-vertical" onDragEnd={handleDragEnd}>
            {workflowStates.map((state) => {
              const columnStories = storiesByState[state];
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
                  <KanbanColumnHeader state={state} count={columnStories.length} />
                  <div className="kanban-state-section-list">
                    {columnStories.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openNewStoryInState(state)}
                        className="kanban-column-empty"
                        style={{
                          padding: 24,
                          textAlign: 'center',
                          fontSize: 14,
                          color: 'var(--medium-gray)',
                          background: 'transparent',
                          border: '1px dashed var(--border)',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                        aria-label={`Create story in ${getBoardStateDisplayLabel(state)}`}
                      >
                        + Add story in {getBoardStateDisplayLabel(state)}
                      </button>
                    ) : (
                      <>
                        {columnStories.map((story) => (
                          <div key={story._id} className="kanban-state-section-row">
                            <StoryCard
                              story={story}
                              workflowStates={workflowStates}
                              currentUserId={currentUserId}
                              isDragging={draggingId === story._id}
                              onDragStart={handleDragStart}
                              variant="row"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => openNewStoryInState(state)}
                          className="kanban-column-add"
                          style={{
                            padding: 12,
                            textAlign: 'center',
                            fontSize: 13,
                            color: 'var(--medium-gray)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            width: '100%',
                          }}
                          aria-label={`Create story in ${getBoardStateDisplayLabel(state)}`}
                        >
                          + Add story
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {effectiveShowNewStory && (
        <NewStoryModal
          onClose={handleCloseNewStory}
          onSubmit={handleCreateStory}
          initialStoryState={newStoryInitialState ?? undefined}
          isPackage={effectiveShowNewPackage}
        />
      )}
    </>
  );
}
