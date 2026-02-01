import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Piece, LinkedStoryRef } from '../types/piece';
import type { Story } from '../types/story';
import { piecesApi } from '../utils/piecesApi';
import { storiesApi } from '../utils/storiesApi';
import { ScriptEditor, type ScriptEditorHandle } from '../components/ScriptEditor/ScriptEditor';
import { getPieceTypeDisplayLabel, getAvailablePieceTypes, getPieceTypeTemplate } from '../utils/pieceTypesPreferences';
import { PIECE_STATES, PIECE_STATE_LABELS } from '../types/piece';

export interface PieceDetailProps {
  isModal?: boolean;
  pieceId?: string;
  onClose?: () => void;
}

export interface PieceDetailHandle {
  /** Save script then call onClose. Use when closing the modal so script is saved. */
  saveAndClose: () => Promise<void>;
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
  const [, setSaving] = useState(false);
  const scriptEditorRef = useRef<ScriptEditorHandle | null>(null);
  const [showAddRelatedStory, setShowAddRelatedStory] = useState(false);
  const [addRelatedStoryList, setAddRelatedStoryList] = useState<Story[]>([]);
  const [addingRelatedStoryId, setAddingRelatedStoryId] = useState<string | null>(null);
  const [expandedResearchIds, setExpandedResearchIds] = useState<Set<string>>(new Set());

  const saveAndClose = useCallback(async () => {
    try {
      await scriptEditorRef.current?.saveDraft();
    } finally {
      onClose?.();
    }
  }, [onClose]);

  useImperativeHandle(ref, () => ({ saveAndClose }), [saveAndClose]);

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

  const handleSaveMeta = useCallback(async () => {
    if (!pieceId || !piece) return;
    setSaving(true);
    try {
      const updated = await piecesApi.update(pieceId, {
        headline: headline.trim() || piece.headline,
        state,
        format: format.trim() || piece.format,
      });
      setPiece(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [pieceId, piece, headline, state, format]);

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

  const formatLabel = getPieceTypeDisplayLabel(piece.format);
  const hasLinkedStories = Array.isArray(piece.linkedStoryIds) && piece.linkedStoryIds.length > 0;
  const availableFormats = getAvailablePieceTypes();
  const formatOptions = piece.format && !availableFormats.includes(piece.format)
    ? [piece.format, ...availableFormats]
    : availableFormats;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top: main info full width */}
      <div className="shrink-0 bg-app-bg-secondary px-4 pb-3 pt-2">
        <div className="flex items-center justify-between gap-4">
          {onClose && (
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
          )}
          <h1 id="piece-detail-title" className="text-lg font-semibold text-app-text-primary truncate min-w-0 flex-1">
            {formatLabel} · {piece.headline}
          </h1>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-app-text-tertiary">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              onBlur={handleSaveMeta}
              className="mt-1 w-full rounded bg-app-bg-primary px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-1 focus:ring-app-accent"
              placeholder="Piece headline"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-text-tertiary">Format</label>
            <select
              value={format}
              onChange={async (e) => {
                const v = e.target.value;
                setFormat(v);
                if (!pieceId) return;
                setSaving(true);
                try {
                  const updated = await piecesApi.update(pieceId, { format: v });
                  setPiece(updated);
                } catch {
                  setFormat(piece.format);
                } finally {
                  setSaving(false);
                }
              }}
              onBlur={handleSaveMeta}
              className="mt-1 w-full rounded bg-app-bg-primary px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-1 focus:ring-app-accent"
            >
              {formatOptions.map((f) => (
                <option key={f} value={f}>{getPieceTypeDisplayLabel(f)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-app-text-tertiary">State</label>
            <select
              value={state}
              onChange={async (e) => {
                const v = e.target.value;
                setState(v);
                if (!pieceId) return;
                setSaving(true);
                try {
                  const updated = await piecesApi.update(pieceId, { state: v });
                  setPiece(updated);
                } catch {
                  setState(state);
                } finally {
                  setSaving(false);
                }
              }}
              className="mt-1 w-full rounded bg-app-bg-primary px-3 py-2 text-sm text-app-text-primary focus:outline-none focus:ring-1 focus:ring-app-accent"
            >
              {PIECE_STATES.map((s) => (
                <option key={s} value={s}>{PIECE_STATE_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-app-text-tertiary">
          Created by {(piece.createdBy as { name?: string })?.name ?? 'Unknown'}
        </p>
      </div>
      {/* Bottom: Script (left) 6/10 | Research (right) 4/10 */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-[6] flex-col">
          <div className="flex-1 min-h-0 overflow-auto p-4">
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
        <div className="flex min-w-0 flex-[4] flex-col bg-app-bg-secondary">
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
                const showPreview = hasResearch && isLong && !isExpanded;
                const displayText = showPreview
                  ? research.slice(0, RESEARCH_PREVIEW_MAX_LENGTH)
                  : research;
                return (
                  <div key={s._id} className="rounded bg-app-bg-primary p-3">
                    <Link to={`${basePath}/story/${s._id}`} className="text-sm font-medium text-app-text-primary hover:underline">
                      {s.headline}
                    </Link>
                    {hasResearch ? (
                      <>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-app-text-secondary">
                          {displayText}
                          {showPreview ? '…' : ''}
                        </div>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleResearchExpanded(s._id)}
                            className="mt-1.5 text-sm font-medium text-app-link hover:underline"
                          >
                            {isExpanded ? 'Read less' : 'Read more…'}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-app-text-tertiary italic">No research notes</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-app-text-tertiary">No linked stories. Link stories to this piece to see their research here.</p>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={showAddRelatedStory ? () => setShowAddRelatedStory(false) : openAddRelatedStory}
                className="text-sm font-medium text-app-link hover:underline"
              >
                {showAddRelatedStory ? 'Cancel' : '+ Add related story'}
              </button>
              {showAddRelatedStory && (
                <ul className="mt-2 space-y-1">
                  {addRelatedStoryList.length === 0 ? (
                    <li className="text-xs text-app-text-tertiary">No stories available to add (all are already linked or are series).</li>
                  ) : (
                    addRelatedStoryList.map((s) => (
                      <li key={s._id}>
                        <button
                          type="button"
                          onClick={() => addRelatedStory(s._id)}
                          disabled={addingRelatedStoryId === s._id}
                          className="text-left w-full rounded px-2 py-1.5 text-sm text-app-text-primary hover:bg-app-bg-hover disabled:opacity-60"
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
      </div>
    </div>
  );
});

export default PieceDetail;
