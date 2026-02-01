import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Piece, LinkedStoryRef } from '../types/piece';
import type { Story } from '../types/story';
import { piecesApi } from '../utils/piecesApi';
import { storiesApi } from '../utils/storiesApi';
import { usersApi } from '../utils/usersApi';
import type { User } from '../types/user';
import { ScriptEditor, type ScriptEditorHandle } from '../components/ScriptEditor/ScriptEditor';
import { getPieceTypeDisplayLabel, getAvailablePieceTypes, getPieceTypeTemplate } from '../utils/pieceTypesPreferences';
import {
  PIECE_STATES,
  PIECE_STATE_LABELS,
  BOARD_PIECE_STATES,
  BOARD_PIECE_STATE_LABELS,
  PIECE_WORKFLOW_COLORS,
  type BoardPieceState,
} from '../types/piece';
import { RejectModal, ParkModal } from '../components/IdeasInbox';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, onOutside]);
}

function canApproveIdeas(_role: string | undefined): boolean {
  return true;
}

export interface PieceDetailProps {
  isModal?: boolean;
  pieceId?: string;
  onClose?: () => void;
}

export interface PieceDetailHandle {
  /** Save script then call onClose. Use when closing the modal so script is saved. */
  saveAndClose: () => Promise<void>;
  /** Save script without closing. Use for the modal Save button. */
  save: () => Promise<void>;
}

const RESEARCH_PREVIEW_MAX_LENGTH = 400;

const PieceDetail = forwardRef<PieceDetailHandle, PieceDetailProps>(function PieceDetail(
  { isModal: _isModal, pieceId: pieceIdProp, onClose },
  ref
) {
  const pieceId = pieceIdProp;
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const user = useAuthStore((s) => s.user);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [state, setState] = useState<string>('scripting');
  const [format, setFormat] = useState<string>('');
  const [deadlines, setDeadlines] = useState<Record<BoardPieceState, string>>(() => ({
    scripting: '',
    multimedia: '',
    finalization: '',
    published: '',
  }));
  const [, setSaving] = useState(false);
  const scriptEditorRef = useRef<ScriptEditorHandle | null>(null);
  const deadlinesPopupRef = useRef<HTMLDivElement | null>(null);
  const [deadlinesPopupOpen, setDeadlinesPopupOpen] = useState(false);
  const [showAddRelatedStory, setShowAddRelatedStory] = useState(false);
  const [addRelatedStoryList, setAddRelatedStoryList] = useState<Story[]>([]);
  const [addingRelatedStoryId, setAddingRelatedStoryId] = useState<string | null>(null);
  const [expandedResearchIds, setExpandedResearchIds] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [users, setUsers] = useState<Pick<User, '_id' | 'name' | 'email'>[]>([]);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [assignRoleStep, setAssignRoleStep] = useState<1 | 2>(1);
  const [assignRoleRole, setAssignRoleRole] = useState('');
  const [assignRoleUserId, setAssignRoleUserId] = useState('');
  const [assignments, setAssignments] = useState<{ role: string; userId: string }[]>([]);

  useClickOutside(deadlinesPopupRef, useCallback(() => setDeadlinesPopupOpen(false), []));
  useEffect(() => {
    if (!deadlinesPopupOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDeadlinesPopupOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [deadlinesPopupOpen]);

  const saveAndClose = useCallback(async () => {
    try {
      await scriptEditorRef.current?.saveDraft();
    } finally {
      onClose?.();
    }
  }, [onClose]);

  const save = useCallback(async () => {
    await scriptEditorRef.current?.saveDraft();
  }, []);

  useImperativeHandle(ref, () => ({ saveAndClose, save }), [saveAndClose, save]);

  function getUserId(ref: string | { _id: string } | undefined): string | null {
    if (!ref) return null;
    return typeof ref === 'object' ? ref._id : ref;
  }

  function buildAssignmentsFromPiece(p: Piece): { role: string; userId: string }[] {
    if (p.teamMembers?.length) {
      return p.teamMembers
        .map((m) => ({
          role: m.role || '',
          userId: getUserId(m.userId) ?? '',
        }))
        .filter((a) => a.role && a.userId);
    }
    const list: { role: string; userId: string }[] = [];
    const prodId = getUserId(p.producer ?? undefined);
    if (prodId) list.push({ role: 'Producer', userId: prodId });
    (p.editors ?? []).forEach((e) => {
      const uid = getUserId(e);
      if (uid) list.push({ role: 'Editor', userId: uid });
    });
    return list;
  }

  function assignmentsToPayload(list: { role: string; userId: string }[]) {
    const teamMembers = list.map((a) => ({ userId: a.userId, role: a.role }));
    const producer = list.find((a) => a.role === 'Producer')?.userId ?? null;
    const editors = list.filter((a) => a.role === 'Editor').map((a) => a.userId);
    return { teamMembers, producer, editors };
  }

  const fetchPiece = useCallback(async () => {
    if (!pieceId) return;
    setLoading(true);
    setError(null);
    try {
      const o = await piecesApi.get(pieceId);
      setPiece(o);
      setHeadline(o.headline);
      setState(o.state);
      setFormat(o.format ?? '');
      setAssignments(buildAssignmentsFromPiece(o));
      const byState: Record<BoardPieceState, string> = {
        scripting: '',
        multimedia: '',
        finalization: '',
        published: '',
      };
      if (o.deadlines) {
        (BOARD_PIECE_STATES as readonly BoardPieceState[]).forEach((s) => {
          const v = o.deadlines?.[s];
          byState[s] = v ? String(v).slice(0, 10) : '';
        });
      } else if (o.deadline) {
        const s = (o.state?.toLowerCase() || 'scripting') as BoardPieceState;
        if (s in byState) byState[s] = o.deadline.slice(0, 10);
      }
      setDeadlines(byState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load piece');
      setPiece(null);
    } finally {
      setLoading(false);
    }
  }, [pieceId]);

  useEffect(() => {
    fetchPiece();
  }, [fetchPiece]);

  useEffect(() => {
    usersApi.list().then((res) => setUsers(res.users ?? [])).catch(() => setUsers([]));
  }, []);

  const handleSaveMeta = useCallback(async () => {
    if (!pieceId || !piece) return;
    setSaving(true);
    try {
      const deadlinesPayload: Partial<Record<BoardPieceState, string | null>> = {};
      (BOARD_PIECE_STATES as readonly BoardPieceState[]).forEach((s) => {
        const v = deadlines[s]?.trim();
        deadlinesPayload[s] = v ? `${v}T23:59:59.000Z` : null;
      });
      const { producer, editors, teamMembers } = assignmentsToPayload(assignments);
      const updated = await piecesApi.update(pieceId, {
        headline: headline.trim() || piece.headline,
        state,
        format: format.trim() || piece.format,
        deadlines: deadlinesPayload,
        producer,
        editors,
        teamMembers,
      });
      setPiece(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [pieceId, piece, headline, state, format, deadlines, assignments]);

  const currentLinkedIds = (piece?.linkedStoryIds ?? []).map((s) => (typeof s === 'string' ? s : s._id));

  const openAddRelatedStory = useCallback(async () => {
    setShowAddRelatedStory(true);
    try {
      const res = await storiesApi.list({ limit: 100 });
      const alreadyLinked = new Set(currentLinkedIds);
      const available = res.stories.filter(
        (s) => s.kind !== 'parent' && !alreadyLinked.has(s._id)
      );
      setAddRelatedStoryList(available);
    } catch {
      setAddRelatedStoryList([]);
    }
  }, [currentLinkedIds.join(',')]);

  const addRelatedStory = useCallback(
    async (storyId: string) => {
      if (!pieceId || !piece) return;
      setAddingRelatedStoryId(storyId);
      try {
        const nextIds = [...currentLinkedIds, storyId];
        const updated = await piecesApi.update(pieceId, { linkedStoryIds: nextIds });
        setPiece(updated);
        setAddRelatedStoryList((prev) => prev.filter((s) => s._id !== storyId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link story');
      } finally {
        setAddingRelatedStoryId(null);
      }
    },
    [pieceId, piece, currentLinkedIds]
  );

  const toggleResearchExpanded = useCallback((storyId: string) => {
    setExpandedResearchIds((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  }, []);

  const handleApprovePiece = useCallback(async () => {
    if (!pieceId || !user) return;
    try {
      await piecesApi.update(pieceId, {
        approved: true,
        approvedBy: user._id,
        approvedAt: new Date().toISOString(),
      });
      await fetchPiece();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  }, [pieceId, user, fetchPiece]);

  const handleRejectPieceConfirm = useCallback(
    async (reason: string) => {
      if (!pieceId) return;
      try {
        await piecesApi.update(pieceId, {
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || undefined,
        });
        setShowRejectModal(false);
        await fetchPiece();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject');
      }
    },
    [pieceId, fetchPiece]
  );

  const handleParkPieceConfirm = useCallback(
    async (date: Date) => {
      if (!pieceId) return;
      try {
        await piecesApi.update(pieceId, { parkedUntil: date.toISOString() });
        setShowParkModal(false);
        await fetchPiece();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to park');
      }
    },
    [pieceId, fetchPiece]
  );

  if (!pieceId) {
    return (
      <div className="p-6 text-app-text-secondary">
        No piece selected.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-current" />
        <span className="ml-3 text-sm text-app-text-secondary">Loading…</span>
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error ?? 'Piece not found.'}</p>
        {onClose && (
          <button type="button" onClick={onClose} className="mt-3 text-sm text-app-link hover:underline">
            Close
          </button>
        )}
      </div>
    );
  }

  const hasLinkedStories = Array.isArray(piece.linkedStoryIds) && piece.linkedStoryIds.length > 0;
  const isPieceIdea = !hasLinkedStories && !piece.approved && !piece.rejectedAt;
  const canApprovePiece = canApproveIdeas(user?.role);
  const availableFormats = getAvailablePieceTypes();
  const formatOptions = piece.format && !availableFormats.includes(piece.format)
    ? [piece.format, ...availableFormats]
    : availableFormats;
  const stateColor = (PIECE_WORKFLOW_COLORS as Record<string, string>)[state] ?? 'var(--app-text-tertiary)';

  return (
    <div className="flex h-full min-h-0 flex-col bg-app-bg-primary">
      <header className="sticky top-0 z-10 shrink-0 border-b border-app-border-light bg-app-bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          {onClose && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveAndClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-app-text-secondary transition-colors duration-[120ms] hover:bg-app-bg-hover hover:text-app-text-primary"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5L5 15M5 5l10 10" />
                </svg>
              </button>
            </div>
          )}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                onBlur={handleSaveMeta}
                className="w-full min-w-0 rounded-md border-0 bg-transparent px-0 py-1 text-lg font-semibold text-app-text-primary placeholder:text-app-text-tertiary focus:outline-none focus:ring-0 sm:text-xl"
                placeholder="Piece headline"
                aria-label="Headline"
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <select
                  value={state}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setState(v);
                    if (pieceId) {
                      try {
                        const updated = await piecesApi.update(pieceId, { state: v });
                        setPiece(updated);
                      } catch {
                        setState(state);
                      }
                    }
                  }}
                  className="rounded-full border-0 px-2 py-0.5 font-medium focus:ring-1 focus:ring-app-accent-primary focus:outline-none"
                  style={{ backgroundColor: `${stateColor}22`, color: stateColor }}
                >
                  {PIECE_STATES.map((s) => (
                    <option key={s} value={s}>{PIECE_STATE_LABELS[s] ?? s}</option>
                  ))}
                </select>
                <select
                  value={format}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setFormat(v);
                    if (pieceId) {
                      try {
                        const updated = await piecesApi.update(pieceId, { format: v });
                        setPiece(updated);
                      } catch {
                        setFormat(piece.format);
                      }
                    }
                  }}
                  className="rounded border border-app-border-light bg-app-bg-secondary px-2 py-0.5 text-app-text-primary focus:border-app-accent-primary focus:outline-none focus:ring-1 focus:ring-app-accent-primary"
                >
                  {formatOptions.map((f) => (
                    <option key={f} value={f}>{getPieceTypeDisplayLabel(f)}</option>
                  ))}
                </select>
                <span className="text-app-text-tertiary">
                  By {(piece.createdBy as { name?: string })?.name ?? 'Unknown'}
                </span>
                <span className="text-app-text-tertiary">·</span>
                <div ref={deadlinesPopupRef} className="relative inline">
                  <button
                    type="button"
                    onClick={() => setDeadlinesPopupOpen((o) => !o)}
                    className="text-app-text-tertiary hover:text-app-text-primary hover:underline"
                  >
                    Deadlines
                    {(BOARD_PIECE_STATES as readonly BoardPieceState[]).some((s) => deadlines[s]?.trim()) ? ' ✓' : ''}
                  </button>
                  {deadlinesPopupOpen && (
                    <div
                      className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-app-border-light bg-app-bg-primary p-3 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-2">
                        {(BOARD_PIECE_STATES as readonly BoardPieceState[]).map((s) => (
                          <label key={s} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-xs text-app-text-tertiary">{BOARD_PIECE_STATE_LABELS[s]}</span>
                            <input
                              type="date"
                              value={deadlines[s] ?? ''}
                              onChange={(e) => setDeadlines((prev) => ({ ...prev, [s]: e.target.value }))}
                              onBlur={handleSaveMeta}
                              className="flex-1 rounded border border-app-border-light bg-app-bg-secondary px-2 py-1 text-xs text-app-text-primary focus:border-app-accent-primary focus:outline-none"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-app-text-tertiary">·</span>
                <span className="text-app-text-tertiary">Team:</span>
                {assignments.length === 0 ? (
                  <span className="text-app-text-tertiary">—</span>
                ) : (
                  <span className="text-app-text-secondary">
                    {assignments.map((a, i) => {
                      const name = users.find((u) => u._id === a.userId)?.name || users.find((u) => u._id === a.userId)?.email || '?';
                      return (
                        <span key={`${a.role}-${a.userId}-${i}`} className="inline-flex items-center gap-0.5">
                          {i > 0 && ', '}
                          {name} ({a.role})
                          <button
                            type="button"
                            onClick={async () => {
                              const next = assignments.filter((_, j) => j !== i);
                              setAssignments(next);
                              if (pieceId && piece) {
                                try {
                                  const { producer, editors, teamMembers } = assignmentsToPayload(next);
                                  const updated = await piecesApi.update(pieceId, { producer, editors, teamMembers });
                                  setPiece(updated);
                                } catch {
                                  setAssignments(assignments);
                                }
                              }
                            }}
                            className="ml-0.5 rounded p-0.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-text-primary"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setAssignRoleStep(1); setAssignRoleRole(''); setAssignRoleUserId(''); setShowAssignRoleModal(true); }}
                  className="text-app-accent-primary hover:underline"
                >
                  + Assign
                </button>
              </div>
            </div>
            {isPieceIdea && canApprovePiece && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleApprovePiece}
                  className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setShowParkModal(true)}
                  className="rounded-md border border-app-border-light bg-app-bg-secondary px-3 py-1.5 text-xs font-medium text-app-text-primary hover:bg-app-bg-hover"
                >
                  Park
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-text-primary"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 min-w-0">
        <div className="flex min-w-0 flex-[6] flex-col">
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-xl border border-app-border-light bg-app-bg-secondary/50 p-4 min-h-[400px]">
                <ScriptEditor
                  ref={scriptEditorRef}
                  storyId=""
                  pieceId={pieceId}
                  currentUserId={user?._id ?? ''}
                  initialContentWhenEmpty={piece ? (getPieceTypeTemplate(piece.format)?.script ?? '') : ''}
                  onDirty={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-[4] flex-col border-l border-app-border-light bg-app-bg-secondary">
          <div className="shrink-0 px-4 py-2">
            <h2 className="text-sm font-medium text-app-text-secondary">Research from linked stories</h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {hasLinkedStories ? (
              (piece.linkedStoryIds as LinkedStoryRef[]).map((s) => {
                const research = s.researchNotes?.trim() ?? '';
                const hasResearch = research !== '';
                const isLong = research.length > RESEARCH_PREVIEW_MAX_LENGTH;
                const isExpanded = expandedResearchIds.has(s._id);
                const displayText = hasResearch && isLong && !isExpanded
                  ? research.slice(0, RESEARCH_PREVIEW_MAX_LENGTH)
                  : research;
                return (
                  <article key={s._id} className="rounded-xl border border-app-border-light bg-app-bg-primary p-3 shadow-sm">
                    <Link to={`${basePath}/story/${s._id}`} className="text-sm font-semibold text-app-text-primary hover:text-app-accent-primary hover:underline">
                      {s.headline}
                    </Link>
                    {hasResearch ? (
                      <>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-app-text-secondary leading-relaxed">
                          {displayText}
                          {isLong && !isExpanded ? '…' : ''}
                        </div>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleResearchExpanded(s._id)}
                            className="mt-1.5 text-xs font-medium text-app-accent-primary hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-xs italic text-app-text-tertiary">No research notes</p>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-app-border-light bg-app-bg-primary/50 p-4 text-center text-sm text-app-text-tertiary">
                No linked stories. Link stories to see their research here.
              </p>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={showAddRelatedStory ? () => setShowAddRelatedStory(false) : openAddRelatedStory}
                className="text-sm font-medium text-app-accent-primary hover:underline"
              >
                {showAddRelatedStory ? 'Cancel' : '+ Add related story'}
              </button>
              {showAddRelatedStory && (
                <ul className="mt-2 space-y-1 rounded-lg border border-app-border-light bg-app-bg-primary p-2">
                  {addRelatedStoryList.length === 0 ? (
                    <li className="text-xs text-app-text-tertiary">No stories available to add.</li>
                  ) : (
                    addRelatedStoryList.map((s) => (
                      <li key={s._id}>
                        <button
                          type="button"
                          onClick={() => addRelatedStory(s._id)}
                          disabled={addingRelatedStoryId === s._id}
                          className="w-full rounded px-2 py-2 text-left text-sm text-app-text-primary hover:bg-app-bg-hover disabled:opacity-60"
                        >
                          {s.headline}
                          {addingRelatedStoryId === s._id ? ' …' : ''}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {showAssignRoleModal && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowAssignRoleModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-app-border-light bg-app-bg-primary p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-app-text-primary">
              {assignRoleStep === 1 ? 'Choose role' : 'Choose member'}
            </h3>
            {assignRoleStep === 1 ? (
              <>
                <select
                  value={assignRoleRole}
                  onChange={(e) => setAssignRoleRole(e.target.value)}
                  className="mt-3 w-full rounded-md border border-app-border-light bg-app-bg-secondary px-3 py-2 text-sm text-app-text-primary focus:border-app-accent-primary focus:outline-none focus:ring-1 focus:ring-app-accent-primary"
                >
                  <option value="">— Role —</option>
                  <option value="Producer">Producer</option>
                  <option value="Editor">Editor</option>
                  <option value="Videographer">Videographer</option>
                  <option value="Reporter">Reporter</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Other">Other</option>
                </select>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAssignRoleModal(false)} className="rounded-md px-3 py-1.5 text-sm text-app-text-secondary hover:bg-app-bg-hover">Cancel</button>
                  <button type="button" onClick={() => assignRoleRole && setAssignRoleStep(2)} disabled={!assignRoleRole} className="rounded-md bg-app-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">Next</button>
                </div>
              </>
            ) : (
              <>
                <select
                  value={assignRoleUserId}
                  onChange={(e) => setAssignRoleUserId(e.target.value)}
                  className="mt-3 w-full rounded-md border border-app-border-light bg-app-bg-secondary px-3 py-2 text-sm text-app-text-primary focus:border-app-accent-primary focus:outline-none focus:ring-1 focus:ring-app-accent-primary"
                >
                  <option value="">— Member —</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name || u.email}</option>
                  ))}
                </select>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setAssignRoleStep(1)} className="rounded-md px-3 py-1.5 text-sm text-app-text-secondary hover:bg-app-bg-hover">Back</button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!assignRoleUserId || !pieceId || !piece) return;
                      const next = [...assignments, { role: assignRoleRole, userId: assignRoleUserId }];
                      setAssignments(next);
                      setShowAssignRoleModal(false);
                      setAssignRoleRole('');
                      setAssignRoleUserId('');
                      try {
                        const { producer, editors, teamMembers } = assignmentsToPayload(next);
                        const updated = await piecesApi.update(pieceId, { producer, editors, teamMembers });
                        setPiece(updated);
                      } catch {
                        setAssignments(assignments);
                      }
                    }}
                    disabled={!assignRoleUserId}
                    className="rounded-md bg-app-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRejectModal && (
        <RejectModal
          ideaHeadline={piece.headline}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleRejectPieceConfirm}
        />
      )}
      {showParkModal && (
        <ParkModal
          ideaHeadline={piece.headline}
          onClose={() => setShowParkModal(false)}
          onConfirm={handleParkPieceConfirm}
        />
      )}
    </div>
  );
});

export default PieceDetail;
