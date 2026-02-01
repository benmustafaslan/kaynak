import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Story, StoryChecklistItem, UserRef } from '../types/story';
import { storiesApi } from '../utils/storiesApi';
import { activityApi, type ActivityItem } from '../utils/activityApi';
import { factChecksApi, type FactCheck } from '../utils/factChecksApi';
import { scriptVersionsApi } from '../utils/scriptVersionsApi';
import { downloadExport } from '../utils/exportApi';
import { usersApi } from '../utils/usersApi';
import { storyCommentsApi, type StoryComment } from '../utils/storyCommentsApi';
import type { User } from '../types/user';
import { ScriptEditor, type ScriptEditorHandle } from '../components/ScriptEditor/ScriptEditor';
import { AddFactCheckModal } from '../components/FactCheck/AddFactCheckModal';
import { FactCheckList } from '../components/FactCheck/FactCheckList';
import { piecesApi } from '../utils/piecesApi';
import type { Piece } from '../types/piece';
import { PIECE_STATE_LABELS } from '../types/piece';
import { getAvailablePieceTypes, getPieceTypeDisplayLabel, getPieceTypeTemplate } from '../utils/pieceTypesPreferences';
import { SeriesSearchBar } from '../components/Kanban/SeriesSearchBar';
import { LongTextField } from '../components/LongTextField';
import { AssignmentModal, RejectModal, ParkModal } from '../components/IdeasInbox';
import type { AssignmentResult } from '../components/IdeasInbox/AssignmentModal';

function canApproveIdeas(role: string | undefined): boolean {
  return role === 'chief_editor' || role === 'producer';
}

const TABS = ['Research', 'Media', 'Activity'] as const;
type Tab = (typeof TABS)[number];

/** Reference-style property row icons (Notion-like: clock, calendar, person, checkbox). */
const IconProject = () => (
  <svg className="h-4 w-4 shrink-0 text-app-text-secondary" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 2" />
  </svg>
);
const IconPerson = () => (
  <svg className="h-4 w-4 shrink-0 text-app-text-secondary" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="5" r="2.5" />
    <path d="M3 14c0-2.5 2.5-4 5-4s5 1.5 5 4" />
  </svg>
);
const IconPlus = () => (
  <svg className="h-4 w-4 shrink-0 text-app-text-tertiary" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

/** Role assignments in Story details – multiple people per role. Predefined + custom (user-editable). */
const ROLE_OPTIONS = ['Producer', 'Editor', 'Videographer', 'Reporter', 'Researcher'] as const;
const CUSTOM_ROLE_PLACEHOLDER = 'Other…';
const REMOVED_ROLE_TYPES_KEY = 'kaynak_removed_role_types';
const CUSTOM_ROLE_TYPES_KEY = 'kaynak_custom_role_types';

function loadRemovedRoleTypes(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_ROLE_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadCustomRoleTypes(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROLE_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface RoleAssignment {
  role: string;
  userId: string;
}

function getUserId(ref: string | UserRef | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'object' ? ref._id : ref;
}

function buildAssignmentsFromStory(story: Story): RoleAssignment[] {
  if (story.teamMembers?.length) {
    return story.teamMembers
      .map((m) => ({ role: m.role, userId: getUserId(m.userId) }))
      .filter((a): a is RoleAssignment => Boolean(a.userId));
  }
  const assignments: RoleAssignment[] = [];
  const producerId = getUserId(story.producer);
  if (producerId) assignments.push({ role: 'Producer', userId: producerId });
  (story.editors ?? []).forEach((e) => {
    const uid = getUserId(e);
    if (uid) assignments.push({ role: 'Editor', userId: uid });
  });
  return assignments;
}

export interface StoryDetailProps {
  isModal?: boolean;
  storyId?: string;
  onClose?: () => void;
}

export interface StoryDetailHandle {
  /** Save story + script then call onClose. Use when closing the modal. */
  saveAndClose: () => Promise<void>;
}

const StoryDetail = forwardRef<StoryDetailHandle, StoryDetailProps>(function StoryDetail(
  { isModal, storyId: storyIdProp, onClose },
  ref
) {
  const { id: paramsId, workspaceSlug } = useParams<{ id: string; workspaceSlug?: string }>();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const id = isModal && storyIdProp ? storyIdProp : paramsId;
  const location = useLocation();
  const navigate = useNavigate();
  const pieceIdFromBoard = (location.state as { pieceId?: string })?.pieceId;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Research');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
  const [factCheckModal, setFactCheckModal] = useState<{ selection: { start: number; end: number; text: string } } | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState<Pick<User, '_id' | 'name' | 'email' | 'role'>[]>([]);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [related, setRelated] = useState<{ parentStory: Story | null; relatedStories: Story[] } | null>(null);
  const [parentStories, setParentStories] = useState<Story[]>([]);
  const [newRoleAssignment, setNewRoleAssignment] = useState<RoleAssignment | null>(null);
  const [, setLastSavedStory] = useState<Story | null>(null);
  const [showMoreProperties, setShowMoreProperties] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [showAddPiece, setShowAddPiece] = useState(false);
  const addPieceDefaultFormat = getAvailablePieceTypes()[0] ?? 'other';
  const addPieceTemplateHeadline = (fmt: string) => (getPieceTypeTemplate(fmt)?.headline ?? '').trim();
  const [addPieceHeadline, setAddPieceHeadline] = useState('');
  const [addPieceFormat, setAddPieceFormat] = useState<string>(addPieceDefaultFormat);
  const [creatingPiece, setCreatingPiece] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const dirtyRef = useRef(false);
  const [, setDirtyTick] = useState(0);
  const scriptEditorRef = useRef<ScriptEditorHandle | null>(null);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirtyTick((t) => t + 1);
  }, []);

  const fetchStory = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const s = await storiesApi.getById(id);
      setStory(s);
      setLastSavedStory(s);
      dirtyRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story');
      setStory(null);
      setLastSavedStory(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  useEffect(() => {
    if (id && pieceIdFromBoard) {
      setEditingPieceId(pieceIdFromBoard);
    }
  }, [id, pieceIdFromBoard]);

  useEffect(() => {
    if (!id) return;
    activityApi.getByStoryId(id).then((res) => setActivity(res.activity)).catch(() => setActivity([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (editingPieceId) {
      factChecksApi.list(id, undefined, editingPieceId).then((res) => setFactChecks(res.factChecks)).catch(() => setFactChecks([]));
    } else {
      factChecksApi.list(id).then((res) => setFactChecks(res.factChecks)).catch(() => setFactChecks([]));
    }
  }, [id, editingPieceId]);

  useEffect(() => {
    usersApi.list().then((res) => setUsers(res.users)).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    storyCommentsApi.list(id).then((res) => setComments(res.comments)).catch(() => setComments([]));
  }, [id]);

  useEffect(() => {
    if (!id || !story?.parentStoryId) {
      setRelated(null);
      return;
    }
    storiesApi.getRelated(id).then((res) => setRelated(res)).catch(() => setRelated(null));
  }, [id, story?.parentStoryId]);

  useEffect(() => {
    if (story?.kind === 'parent') return;
    storiesApi.list({ kind: 'parent', limit: 100 }).then((res) => setParentStories(res.stories)).catch(() => setParentStories([]));
  }, [story?.kind]);

  const fetchPieces = useCallback(async () => {
    if (!id) return;
    try {
      const res = await piecesApi.list(id);
      setPieces(res.pieces);
    } catch {
      setPieces([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id || story?.kind === 'parent') return;
    fetchPieces();
  }, [id, story?.kind, fetchPieces]);

  const handleUpdateStory = useCallback(
    async (
      updates: Partial<
        Pick<
          Story,
          | 'headline'
          | 'description'
          | 'state'
          | 'categories'
          | 'checklist'
          | 'researchNotes'
          | 'producer'
          | 'editors'
          | 'teamMembers'
          | 'parentStoryId'
        >
      >
    ) => {
      if (!id || !story) return;
      setSaving(true);
      try {
        const updated = await storiesApi.update(id, updates);
        setStory(updated);
        setLastSavedStory(updated);
        dirtyRef.current = false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [id, story]
  );

  const getSavePayload = useCallback((s: Story) => ({
    headline: s.headline,
    description: s.description,
    categories: s.categories,
    checklist: s.checklist,
    researchNotes: s.researchNotes,
    parentStoryId: s.parentStoryId,
    teamMembers: s.teamMembers,
  }), []);

  const isIdeaPending = story?.state?.toLowerCase() === 'idea' && !story?.approved && !story?.rejectedAt;
  const canApprove = canApproveIdeas(user?.role);
  const isProducer = user?.role === 'producer';

  const handleAssignmentConfirm = useCallback(
    async (assignments: AssignmentResult) => {
      if (!id || !user) return;
      try {
        const now = new Date().toISOString();
        await storiesApi.update(id, {
          approved: true,
          approvedBy: user._id,
          approvedAt: now,
          producer: assignments.producer || undefined,
          editors: assignments.editors,
        });
        setShowAssignmentModal(false);
        await fetchStory();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve');
      }
    },
    [id, user, fetchStory]
  );

  const handleApproveAsMine = useCallback(async () => {
    if (!id || !user) return;
    try {
      const now = new Date().toISOString();
      await storiesApi.update(id, {
        approved: true,
        approvedBy: user._id,
        approvedAt: now,
        producer: user._id,
        editors: [],
      });
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  }, [id, user, fetchStory]);

  const handleApproveSeries = useCallback(async () => {
    if (!id || !user) return;
    try {
      const now = new Date().toISOString();
      await storiesApi.update(id, {
        approved: true,
        approvedBy: user._id,
        approvedAt: now,
      });
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve series');
    }
  }, [id, user, fetchStory]);

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!id) return;
      try {
        await storiesApi.update(id, {
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || undefined,
        });
        setShowRejectModal(false);
        await fetchStory();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject');
      }
    },
    [id, fetchStory]
  );

  const handleParkConfirm = useCallback(
    async (date: Date) => {
      if (!id) return;
      try {
        await storiesApi.update(id, { parkedUntil: date.toISOString() });
        setShowParkModal(false);
        await fetchStory();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to park');
      }
    },
    [id, fetchStory]
  );

  const hasUnsavedChanges = dirtyRef.current;

  const handleSaveAll = useCallback(async () => {
    if (!story || saving) return;
    if (hasUnsavedChanges) {
      await handleUpdateStory(getSavePayload(story));
    }
    await scriptEditorRef.current?.saveDraft?.();
    dirtyRef.current = false;
    setDirtyTick((t) => t + 1);
  }, [story, hasUnsavedChanges, saving, handleUpdateStory, getSavePayload]);

  const saveAndClose = useCallback(async () => {
    await handleSaveAll();
    onClose?.();
  }, [handleSaveAll, onClose]);

  useImperativeHandle(ref, () => ({ saveAndClose }), [saveAndClose]);

  const handleAddFactCheck = useCallback(
    (selection: { start: number; end: number; text: string }) => {
      setFactCheckModal({ selection });
    },
    []
  );

  const handlePrintPdf = useCallback(async () => {
    if (!story) return;
    try {
      const res = await scriptVersionsApi.getCurrent(story._id);
      const raw = res.content ?? '';
      const scriptContent = escapeHtmlForPrint(raw || '(No script content)');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(story.headline)}</title></head><body>
<h1>${escape(story.headline)}</h1>
<h2>Description</h2>
<p>${escape(story.description)}</p>
<h2>Script</h2>
<div>${scriptContent}</div>
</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 250);
      }
    } catch {
      setError('Failed to load script for print');
    }
    setExportOpen(false);
  }, [story]);

  function escape(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Escape HTML so script content cannot execute when written to print window. */
  function escapeHtmlForPrint(s: string) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const handleDownloadDocx = useCallback(async () => {
    if (!story) return;
    setExporting(true);
    try {
      await downloadExport(story._id, 'docx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }, [story]);

  const handleDownloadHtml = useCallback(async () => {
    if (!story) return;
    setExporting(true);
    try {
      await downloadExport(story._id, 'html');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }, [story]);

  const handleSubmitFactCheck = useCallback(
    async (data: { type: FactCheck['type']; note: string }) => {
      if (!id || !story || !factCheckModal) return;
      const scriptVersion = 0;
      if (editingPieceId) {
        await factChecksApi.create(id, { scriptVersion, textSelection: factCheckModal.selection, type: data.type, note: data.note }, editingPieceId);
        const res = await factChecksApi.list(id, undefined, editingPieceId);
        setFactChecks(res.factChecks);
      } else {
        await factChecksApi.create(id, { scriptVersion, textSelection: factCheckModal.selection, type: data.type, note: data.note });
        const res = await factChecksApi.list(id);
        setFactChecks(res.factChecks);
      }
      setFactCheckModal(null);
    },
    [id, story, factCheckModal, editingPieceId, pieces]
  );

  const suggestedNextSteps = useMemo(() => {
    if (!story) return null;
    const pendingFactChecks = factChecks.filter((f) => f.status === 'pending').length;
    const checklistTotal = story.checklist?.length ?? 0;
    const checklistDone = story.checklist?.filter((c) => c.completed).length ?? 0;
    if (pendingFactChecks > 0) return `${pendingFactChecks} fact-check(s) pending — resolve in Pieces or sidebar.`;
    if (checklistTotal > 0 && checklistDone < checklistTotal) return 'Complete checklist and resolve fact-checks.';
    return null;
  }, [story, factChecks]);

  const handleChecklistToggle = useCallback(
    (index: number) => {
      if (!story?.checklist) return;
      const next = story.checklist.map((c, i) => (i === index ? { ...c, completed: !c.completed } : c));
      handleUpdateStory({ checklist: next });
    },
    [story, handleUpdateStory]
  );

  const handleAddChecklistItem = useCallback(() => {
    const text = newChecklistItem.trim();
    if (!text || !story) return;
    const current = story.checklist ?? [];
    const next: StoryChecklistItem[] = [...current, { text, completed: false, order: current.length }];
    handleUpdateStory({ checklist: next });
    setNewChecklistItem('');
  }, [story, newChecklistItem, handleUpdateStory]);

  const handleAddCategory = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      const tag = categoryInput.trim();
      if (!tag || !story) return;
      const current = story.categories ?? [];
      if (current.includes(tag)) {
        setCategoryInput('');
        return;
      }
      const next = [...current, tag].slice(0, 20);
      handleUpdateStory({ categories: next });
      setCategoryInput('');
    },
    [story, categoryInput, handleUpdateStory]
  );

  const handleRemoveCategory = useCallback(
    (tag: string) => {
      if (!story?.categories) return;
      const next = story.categories.filter((c) => c !== tag);
      handleUpdateStory({ categories: next });
    },
    [story, handleUpdateStory]
  );

  const handleAddComment = useCallback(async () => {
    const text = newCommentText.trim();
    if (!text || !id) return;
    setSubmittingComment(true);
    try {
      const comment = await storyCommentsApi.create(id, { text });
      setComments((prev) => [...prev, comment]);
      setNewCommentText('');
    } catch {
      setError('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  }, [id, newCommentText]);

  const BackOrClose = isModal && onClose ? (
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
  ) : (
    <Link to={`${basePath}/board`} className="text-app-text-secondary text-sm transition-colors duration-[120ms] hover:text-app-text-primary">← Board</Link>
  );

  if (loading && !story) {
    return (
      <div className={`flex flex-col bg-app-bg-primary pl-0 md:pl-[100px] ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
        <header className="border-0 bg-app-bg-primary px-4 py-3 md:px-6">
          <div className="flex w-full max-w-full items-center justify-between md:mx-auto md:max-w-6xl">
            {BackOrClose}
          </div>
        </header>
        <main className="flex w-full max-w-full flex-1 items-center justify-center p-4 md:mx-auto md:max-w-6xl md:p-6">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-app-border-light border-t-app-blue" />
          <span className="ml-2 text-app-text-secondary">Loading…</span>
        </main>
      </div>
    );
  }

  if (error && !story) {
    return (
      <div className={`flex flex-col bg-app-bg-primary pl-0 md:pl-[100px] ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
        <header className="border-0 bg-app-bg-primary px-4 py-3 md:px-6">
          <div className="flex w-full max-w-full items-center justify-between md:mx-auto md:max-w-6xl">
            {BackOrClose}
          </div>
        </header>
        <main className="flex w-full max-w-full flex-1 items-center justify-center p-4 md:mx-auto md:max-w-6xl md:p-6">
          <p className="text-app-red">{error}</p>
        </main>
      </div>
    );
  }

  if (!story) {
    return (
      <div className={`flex flex-col bg-app-bg-primary pl-0 md:pl-[100px] ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
        <header className="border-0 bg-app-bg-primary px-4 py-3 md:px-6">
          <div className="flex w-full max-w-full items-center justify-between md:mx-auto md:max-w-6xl">
            {BackOrClose}
          </div>
        </header>
        <main className="flex w-full max-w-full flex-1 items-center justify-center p-4 md:mx-auto md:max-w-6xl md:p-6">
          <p className="text-app-text-secondary">Story not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex flex-col overflow-auto pl-0 md:pl-[100px] ${isModal ? 'h-full min-h-0 bg-black/20' : 'min-h-screen bg-app-bg-primary'}`}>
      {/* Reference-style: single white card, minimal top bar – fill container with minimal gap; 50% less line spacing */}
      <div className={`flex flex-1 flex-col leading-[0.8] w-full max-w-full px-4 py-4 md:mx-auto md:max-w-[900px] ${isModal ? 'md:px-2 md:py-2' : ''}`}>
        {/* Top bar: back left; Share, Star, menu right – peer for card border on hover */}
        <div className="peer/topbar mb-2 flex items-center justify-between">
          <div className={`flex items-center gap-1 ${isModal ? '-mt-2 md:-ml-[108px] md:mt-0' : ''}`}>
            {BackOrClose}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-sm text-app-text-secondary hover:bg-transparent hover:text-app-text-primary" aria-label="Share">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8.5v3a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 11.5v-3M8 10.5V1M5.5 4L8 1.5 10.5 4" /></svg>
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-sm text-app-text-secondary hover:bg-transparent hover:text-app-text-primary" aria-label="Favorite">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2l1.8 3.6L14 6.5l-2.8 2.7.7 4L8 11.2 4.1 12.5l.7-4L2 6.5l4.2-.9L8 2z" /></svg>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-app-text-secondary hover:bg-transparent hover:text-app-text-primary"
                aria-label="More"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-sm border-0 bg-transparent py-1 shadow-lg">
                    {isModal && (
                      <button type="button" onClick={handleSaveAll} disabled={saving || !hasUnsavedChanges} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-primary hover:bg-transparent disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    )}
                    <button type="button" onClick={handlePrintPdf} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-primary hover:bg-transparent">Print / PDF</button>
                    <button type="button" onClick={handleDownloadDocx} disabled={exporting} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-primary hover:bg-transparent disabled:opacity-50">Download DOCX</button>
                    <button type="button" onClick={handleDownloadHtml} disabled={exporting} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-primary hover:bg-transparent disabled:opacity-50">Download HTML</button>
                    {(story.state?.toLowerCase() === 'archived' ? (
                      <button
                        type="button"
                        onClick={() => { setExportOpen(false); handleUpdateStory({ state: 'published' }); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-primary hover:bg-transparent"
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setExportOpen(false); handleUpdateStory({ state: 'archived' }); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-primary hover:bg-transparent"
                      >
                        Archive
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card – border and background only when top bar (menu/buttons) hovered; fills width */}
        <div className="w-full rounded-sm border-0 bg-transparent shadow-sm transition-[border-color,background-color] peer-hover/topbar:border-transparent peer-hover/topbar:bg-transparent">
          {/* Title – large, bold, editable */}
          <div className="border-0 px-3 pt-4 pb-1">
            <input
              type="text"
              value={story.headline}
              onChange={(e) => { setStory((s) => (s ? { ...s, headline: e.target.value } : s)); markDirty(); }}
              onBlur={(e) => e.target.value !== story.headline && handleUpdateStory({ headline: e.target.value })}
              className="w-full border-0 bg-transparent text-[28px] font-bold leading-tight text-app-text-primary outline-none placeholder:text-app-text-tertiary"
              placeholder="Untitled"
            />
          </div>

          {/* Idea actions – approve / reject / park when viewing an unapproved idea (story or series) */}
          {isIdeaPending && canApprove && (
            <div className="border-0 px-3 py-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-app-text-secondary mr-1">Idea review:</span>
              {story.kind === 'parent' ? (
                <button type="button" className="btn btn-primary" onClick={handleApproveSeries}>
                  ✓ Approve series
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => setShowAssignmentModal(true)}>
                    ✓ Approve & Start Research
                  </button>
                  {isProducer && (
                    <button type="button" className="btn btn-primary" onClick={handleApproveAsMine}>
                      ✓ Approve as my story
                    </button>
                  )}
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setShowParkModal(true)}>
                ⏸ Park for Later
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowRejectModal(true)}>
                Reject
              </button>
            </div>
          )}

          {/* Property rows – icon | label | value (reference style) */}
          <div className="border-0 px-3 py-2">
            {/* Series (parent story) */}
            {story.kind !== 'parent' && (
              <div className="flex items-center gap-3 py-2">
                <IconProject />
                <span className="w-28 shrink-0 text-sm text-app-text-secondary">Part of series</span>
                <div className="min-w-0 flex-1 max-w-md">
                  <SeriesSearchBar
                    series={parentStories}
                    value={typeof story.parentStoryId === 'string' ? story.parentStoryId : (story.parentStoryId as { _id?: string })?._id ?? ''}
                    onChange={(seriesId) => handleUpdateStory({ parentStoryId: seriesId })}
                    placeholder="Search series…"
                    aria-label="Part of series"
                    onSearch={(q) => storiesApi.list({ kind: 'parent', search: q, limit: 50 }).then((r) => r.stories)}
                  />
                </div>
              </div>
            )}
            {/* Roles – first on same line as title; rest and Add on new lines */}
            <div className="space-y-3 py-2">
              {(() => {
                const assignList = buildAssignmentsFromStory(story);
                const rows = newRoleAssignment ? [...assignList, newRoleAssignment] : assignList;
                const updateRoles = (next: RoleAssignment[]) => {
                  handleUpdateStory({ teamMembers: next.filter((a) => a.role && a.userId) });
                  setNewRoleAssignment(null);
                };
                const predefined = new Set(ROLE_OPTIONS);
                const custom = Array.from(new Set([...loadCustomRoleTypes(), ...rows.map((r) => r.role).filter((r) => r && !predefined.has(r as (typeof ROLE_OPTIONS)[number]))])).sort();
                const removed = loadRemovedRoleTypes();
                const opts = [...ROLE_OPTIONS.filter((r) => !removed.includes(r)), ...custom.filter((r) => !removed.includes(r)), ...removed.filter((r) => rows.some((x) => x.role === r)), CUSTOM_ROLE_PLACEHOLDER];
                const firstRow = rows[0];
                const renderRoleRow = (row: RoleAssignment, i: number) => {
                  const isNew = newRoleAssignment && i === rows.length - 1;
                  const showCustom = row.role === '' || row.role === CUSTOM_ROLE_PLACEHOLDER || (row.role && !predefined.has(row.role as (typeof ROLE_OPTIONS)[number]));
                  const selVal = row.role && (predefined.has(row.role as (typeof ROLE_OPTIONS)[number]) || custom.includes(row.role)) ? row.role : CUSTOM_ROLE_PLACEHOLDER;
                  return (
                    <div key={isNew ? 'new' : `${row.role}-${row.userId}-${i}`} className="flex w-full items-center gap-3 pl-[calc(1rem+5rem)]">
                      <select
                        value={selVal}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === CUSTOM_ROLE_PLACEHOLDER) {
                            if (isNew) setNewRoleAssignment((p) => (p ? { ...p, role: '' } : { role: '', userId: '' }));
                            else updateRoles(assignList.map((a, j) => (j === i ? { ...a, role: '' } : a)));
                          } else {
                            if (isNew) setNewRoleAssignment((p) => (p ? { ...p, role: v } : { role: v, userId: '' }));
                            else updateRoles(assignList.map((a, j) => (j === i ? { ...a, role: v } : a)));
                          }
                        }}
                        className="min-w-[120px] rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm text-app-text-primary focus:border-[#2383e6] focus:outline-none"
                      >
                        {opts.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {showCustom && (
                        <input
                          type="text"
                          value={row.role && row.role !== CUSTOM_ROLE_PLACEHOLDER ? row.role : ''}
                          onChange={(e) => {
                            const r = e.target.value.trim();
                            if (isNew) setNewRoleAssignment((p) => (p ? { ...p, role: r } : { role: r, userId: '' }));
                            else updateRoles(assignList.map((a, j) => (j === i ? { ...a, role: r } : a)));
                          }}
                          placeholder="Role"
                          className="min-w-[80px] rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm focus:border-[#2383e6] focus:outline-none"
                        />
                      )}
                      <select
                        value={row.userId}
                        onChange={(e) => {
                          const u = e.target.value;
                          if (isNew) {
                            if (u && row.role) updateRoles([...assignList, { role: row.role, userId: u }]);
                            else if (u) setNewRoleAssignment((p) => (p ? { ...p, userId: u } : null));
                            else setNewRoleAssignment((p) => (p ? { ...p, userId: '' } : null));
                          } else {
                            updateRoles(assignList.map((a, j) => (j === i ? { ...a, userId: u } : a)));
                          }
                        }}
                        className="min-w-[140px] rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm text-app-text-primary focus:border-[#2383e6] focus:outline-none"
                      >
                        <option value="">— Person —</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>{u.name || u.email}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => (isNew ? setNewRoleAssignment(null) : updateRoles(assignList.filter((_, j) => j !== i)))} className="shrink-0 rounded-sm p-1 text-app-text-tertiary hover:bg-transparent hover:text-app-text-primary" aria-label="Remove">×</button>
                    </div>
                  );
                };
                return (
                  <>
                    <div className="flex w-full flex-wrap items-center gap-3">
                      <IconPerson />
                      <span className="w-20 shrink-0 text-sm text-app-text-secondary">Roles</span>
                      {firstRow ? (
                        <>
                          <select
                            value={firstRow.role && (predefined.has(firstRow.role as (typeof ROLE_OPTIONS)[number]) || custom.includes(firstRow.role)) ? firstRow.role : CUSTOM_ROLE_PLACEHOLDER}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === CUSTOM_ROLE_PLACEHOLDER) {
                                if (rows.length === 1 && newRoleAssignment) setNewRoleAssignment((p) => (p ? { ...p, role: '' } : { role: '', userId: '' }));
                                else updateRoles(assignList.map((a, j) => (j === 0 ? { ...a, role: '' } : a)));
                              } else {
                                if (rows.length === 1 && newRoleAssignment) setNewRoleAssignment((p) => (p ? { ...p, role: v } : { role: v, userId: '' }));
                                else updateRoles(assignList.map((a, j) => (j === 0 ? { ...a, role: v } : a)));
                              }
                            }}
                            className="min-w-[120px] rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm text-app-text-primary focus:border-[#2383e6] focus:outline-none"
                          >
                            {opts.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          {(firstRow.role === '' || firstRow.role === CUSTOM_ROLE_PLACEHOLDER || (firstRow.role && !predefined.has(firstRow.role as (typeof ROLE_OPTIONS)[number]))) && (
                            <input
                              type="text"
                              value={firstRow.role && firstRow.role !== CUSTOM_ROLE_PLACEHOLDER ? firstRow.role : ''}
                              onChange={(e) => {
                                const r = e.target.value.trim();
                                if (rows.length === 1 && newRoleAssignment) setNewRoleAssignment((p) => (p ? { ...p, role: r } : { role: r, userId: '' }));
                                else updateRoles(assignList.map((a, j) => (j === 0 ? { ...a, role: r } : a)));
                              }}
                              placeholder="Role"
                              className="min-w-[80px] rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm focus:border-[#2383e6] focus:outline-none"
                            />
                          )}
                          <select
                            value={firstRow.userId}
                            onChange={(e) => {
                              const u = e.target.value;
                              if (rows.length === 1 && newRoleAssignment) {
                                if (u && firstRow.role) updateRoles([...assignList, { role: firstRow.role, userId: u }]);
                                else if (u) setNewRoleAssignment((p) => (p ? { ...p, userId: u } : null));
                                else setNewRoleAssignment((p) => (p ? { ...p, userId: '' } : null));
                              } else {
                                updateRoles(assignList.map((a, j) => (j === 0 ? { ...a, userId: u } : a)));
                              }
                            }}
                            className="min-w-[140px] rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm text-app-text-primary focus:border-[#2383e6] focus:outline-none"
                          >
                            <option value="">— Person —</option>
                            {users.map((u) => (
                              <option key={u._id} value={u._id}>{u.name || u.email}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => (rows.length === 1 && newRoleAssignment ? setNewRoleAssignment(null) : updateRoles(assignList.filter((_, j) => j !== 0)))} className="shrink-0 rounded-sm p-1 text-app-text-tertiary hover:bg-transparent hover:text-app-text-primary" aria-label="Remove">×</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setNewRoleAssignment({ role: 'Producer', userId: '' })} className="rounded-sm border-0 px-3 py-1.5 text-sm font-medium text-app-text-secondary hover:border-[#37352f] hover:text-app-text-primary">Add role</button>
                      )}
                    </div>
                    {rows.slice(1).map((row, i) => renderRoleRow(row, i + 1))}
                    {rows.length > 0 && (
                      <div className="border-0 pt-3 pl-[calc(1rem+5rem)]">
                        {!newRoleAssignment && (
                          <button type="button" onClick={() => setNewRoleAssignment({ role: 'Producer', userId: '' })} className="rounded-sm border-0 px-3 py-1.5 text-sm font-medium text-app-text-secondary hover:border-[#37352f] hover:text-app-text-primary">Add role</button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Tags */}
            <div className="flex items-center gap-3 py-2">
              <IconProject />
              <span className="w-20 shrink-0 text-sm text-app-text-secondary">Tags</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {story.categories?.map((c) => (
                  <span key={c} className="inline-flex items-center gap-0.5 rounded-sm bg-transparent pl-2 pr-1 py-0.5 text-sm text-app-text-primary">
                    {c}
                    <button type="button" onClick={() => handleRemoveCategory(c)} className="rounded-sm p-0.5 hover:bg-transparent" aria-label={`Remove ${c}`}>×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={handleAddCategory}
                  placeholder="+ Add"
                  className="w-14 border-0 bg-transparent py-0.5 text-sm text-app-text-tertiary placeholder:text-app-text-tertiary focus:outline-none"
                />
              </div>
            </div>
            {/* Add a property */}
            <button type="button" onClick={() => setShowMoreProperties((v) => !v)} className="flex items-center gap-2 py-2 text-sm text-app-text-tertiary hover:text-app-text-primary">
              <IconPlus />
              Add a property
            </button>

            {/* More properties (Description, Checklist, Roles) */}
            {showMoreProperties && (
              <div className="border-0 pt-3 space-y-3">
                <div>
                  <LongTextField
                    label="Description"
                    value={story.description}
                    onChange={(v) => { setStory((s) => (s ? { ...s, description: v } : s)); markDirty(); }}
                    onSave={() => handleUpdateStory({ description: story.description })}
                    placeholder="Add description…"
                    charCountLabel="3 min"
                    rows={3}
                    variant="inline"
                    saving={saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text-secondary">Checklist</label>
                  {story.checklist?.length ? (
                    <ul className="space-y-1 text-sm text-app-text-primary">
                      {story.checklist.map((c, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <input type="checkbox" checked={c.completed} onChange={() => handleChecklistToggle(i)} className="h-3.5 w-3.5 rounded-sm" />
                          <span className={c.completed ? 'text-app-text-tertiary line-through' : ''}>{c.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-app-text-tertiary">No checklist items.</p>}
                  <div className="mt-2 flex gap-2">
                    <input type="text" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()} placeholder="Add item" className="min-w-0 flex-1 rounded-sm border-0 bg-transparent px-2 py-1 text-sm focus:border-[#2383e6] focus:outline-none" />
                    <button type="button" onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()} className="rounded-sm bg-transparent px-2 py-1 text-sm text-app-text-primary hover:bg-transparent disabled:opacity-50">Add</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text-secondary">Role assignments</label>
                  <p className="mb-2 text-xs text-app-text-tertiary">Manage role types in <Link to={`${basePath}/preferences`} className="text-[#2383e6] hover:underline">Preferences</Link>.</p>
                  {(() => {
                    const assignList = buildAssignmentsFromStory(story);
                    const rows = newRoleAssignment ? [...assignList, newRoleAssignment] : assignList;
                    const update = (next: RoleAssignment[]) => { handleUpdateStory({ teamMembers: next.filter((a) => a.role && a.userId) }); setNewRoleAssignment(null); };
                    const predefined = new Set(ROLE_OPTIONS);
                    const custom = Array.from(new Set([...loadCustomRoleTypes(), ...rows.map((r) => r.role).filter((r) => r && !predefined.has(r as (typeof ROLE_OPTIONS)[number]))])).sort();
                    const removed = loadRemovedRoleTypes();
                    const opts = [...ROLE_OPTIONS.filter((r) => !removed.includes(r)), ...custom.filter((r) => !removed.includes(r)), ...removed.filter((r) => rows.some((x) => x.role === r)), CUSTOM_ROLE_PLACEHOLDER];
                    return (
                      <div className="space-y-2">
                        {rows.map((row, i) => {
                          const isNew = newRoleAssignment && i === rows.length - 1;
                          const showCustom = row.role === '' || row.role === CUSTOM_ROLE_PLACEHOLDER || (row.role && !predefined.has(row.role as (typeof ROLE_OPTIONS)[number]));
                          const selVal = row.role && (predefined.has(row.role as (typeof ROLE_OPTIONS)[number]) || custom.includes(row.role)) ? row.role : CUSTOM_ROLE_PLACEHOLDER;
                          return (
                            <div key={isNew ? 'new' : `${row.role}-${row.userId}-${i}`} className="flex flex-wrap items-center gap-2">
                              <select value={selVal} onChange={(e) => { const v = e.target.value; if (v === CUSTOM_ROLE_PLACEHOLDER) { if (isNew) setNewRoleAssignment((p) => (p ? { ...p, role: '' } : { role: '', userId: '' })); else update(assignList.map((a, j) => (j === i ? { ...a, role: '' } : a))); } else { if (isNew) setNewRoleAssignment((p) => (p ? { ...p, role: v } : { role: v, userId: '' })); else update(assignList.map((a, j) => (j === i ? { ...a, role: v } : a))); } }} className="rounded-sm border-0 bg-transparent px-2 py-1 text-sm focus:border-[#2383e6] focus:outline-none">
                                {opts.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                              {showCustom && <input type="text" value={row.role && row.role !== CUSTOM_ROLE_PLACEHOLDER ? row.role : ''} onChange={(e) => { const r = e.target.value.trim(); if (isNew) setNewRoleAssignment((p) => (p ? { ...p, role: r } : { role: r, userId: '' })); else update(assignList.map((a, j) => (j === i ? { ...a, role: r } : a))); }} placeholder="Custom role" className="w-24 rounded-sm border-0 bg-transparent px-2 py-1 text-sm focus:border-[#2383e6] focus:outline-none" />}
                              <select value={row.userId} onChange={(e) => { const u = e.target.value; if (isNew) { if (u && row.role) update([...assignList, { role: row.role, userId: u }]); else if (u) setNewRoleAssignment((p) => (p ? { ...p, userId: u } : null)); else setNewRoleAssignment((p) => (p ? { ...p, userId: '' } : null)); } else update(assignList.map((a, j) => (j === i ? { ...a, userId: u } : a))); }} className="rounded-sm border-0 bg-transparent px-2 py-1 text-sm focus:border-[#2383e6] focus:outline-none">
                                <option value="">— Person —</option>
                                {users.map((u) => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                              </select>
                              <button type="button" onClick={() => { if (isNew) setNewRoleAssignment(null); else update(assignList.filter((_, j) => j !== i)); }} className="text-app-text-tertiary hover:text-app-text-primary" aria-label="Remove">×</button>
                            </div>
                          );
                        })}
                        {!newRoleAssignment && <button type="button" onClick={() => setNewRoleAssignment({ role: 'Producer', userId: '' })} className="text-sm text-app-text-tertiary hover:text-app-text-primary">+ Add assignment</button>}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text-secondary">Fact-checks</label>
                  <FactCheckList factChecks={factChecks} compact />
                </div>
                {related && (related.parentStory || related.relatedStories.length > 0) && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-app-text-secondary">Related stories</label>
                    {related.parentStory && <p className="mb-1 text-sm text-app-text-secondary">Series: <Link to={`${basePath}/story/${related.parentStory._id}`} className="text-[#2383e6] hover:underline">{related.parentStory.headline}</Link></p>}
                    <ul className="space-y-1 text-sm">
                      {related.relatedStories.map((s) => (
                        <li key={s._id} className={s._id === story._id ? 'font-medium text-app-text-primary' : ''}>
                          {s._id === story._id ? s.headline : <Link to={`${basePath}/story/${s._id}`} className="text-[#2383e6] hover:underline">{s.headline}</Link>}
                          {s.archivedAt && <span className="ml-2 text-xs text-app-text-tertiary">Archived</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Team Notes – above Pieces, below Add a property */}
        <div className="mt-3 rounded-sm border-0 bg-transparent px-3 py-3">
          <h3 className="mb-1.5 text-sm font-medium text-app-text-primary">Team Notes</h3>
          {comments.length > 0 && (
            <ul className="mb-1.5 space-y-1">
              {comments.map((c) => (
                <li key={c._id} className="rounded-sm bg-transparent p-1.5 text-sm text-app-text-primary">
                  <span className="text-xs text-app-text-secondary">{(c.userId as { name?: string })?.name ?? 'User'}</span>
                  <p className="mt-0.5 whitespace-pre-wrap">{c.text}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-xs font-medium text-app-text-secondary">
              {user?.name?.slice(0, 1) || user?.email?.slice(0, 1) || '?'}
            </div>
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              placeholder="Add a note..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-app-text-primary placeholder:text-app-text-tertiary outline-none"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newCommentText.trim() || submittingComment}
              className="shrink-0 text-sm text-[#2383e6] hover:underline disabled:opacity-50"
            >
              {submittingComment ? 'Sending…' : 'Post'}
            </button>
          </div>
        </div>

        {/* Tabs + content below – single page flow; tab content border only when tab bar hovered */}
        <div className="mt-3">
          <div className="peer/tabs mb-2 flex gap-1 border-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab ? 'text-app-text-primary' : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {suggestedNextSteps && <p className="mb-2 text-sm text-app-text-secondary">{suggestedNextSteps}</p>}
          <div className="rounded-sm border-0 bg-transparent p-3 shadow-sm transition-[border-color,background-color] peer-hover/tabs:border-transparent peer-hover/tabs:bg-transparent">
            {activeTab === 'Research' && (
              <LongTextField
                label="Research"
                value={story.researchNotes ?? ''}
                onChange={(v) => { setStory((s) => (s ? { ...s, researchNotes: v } : s)); markDirty(); }}
                onSave={() => handleUpdateStory({ researchNotes: story.researchNotes ?? '' })}
                placeholder="Research notes and sources…"
                rows={10}
                variant="inline"
                saving={saving}
              />
            )}
            {activeTab === 'Media' && (
              <p className="text-sm text-app-text-secondary">Upload and attach media (coming soon). Paste links in Research for now.</p>
            )}
            {activeTab === 'Activity' && (
              activity.length === 0 ? <p className="text-sm text-app-text-secondary">No activity yet.</p> : (
                <ul className="space-y-2 text-sm text-app-text-primary">
                  {activity.map((a) => (
                    <li key={a._id}>
                      <span className="text-app-text-secondary">{(a.userId as { name?: string })?.name ?? 'User'} · {a.action}</span>
                      <span className="ml-2 text-xs text-app-text-tertiary">{new Date(a.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>

        {/* Pieces – below Research / Media / Activity */}
        {story.kind !== 'parent' && (
          <div className="mt-6 space-y-4 rounded-sm border-0 bg-transparent p-3 shadow-sm">
            <h3 className="text-sm font-medium text-app-text-primary">Pieces</h3>
            {pieces.length > 0 || showAddPiece ? (
              <>
                <ul className="space-y-2">
                  {pieces.map((out) => {
                    const currentLinkedIds = (out.linkedStoryIds ?? []).map((s) => (typeof s === 'string' ? s : s._id));
                    const otherLinkedIds = id ? currentLinkedIds.filter((sid) => sid !== id) : currentLinkedIds;
                    return (
                      <li key={out._id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border-0 bg-transparent px-3 py-2 transition-[border-color,background-color] hover:bg-app-bg-hover">
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/piece/${out._id}`, { state: { from: location.pathname } })}
                          className="min-w-0 flex-1 cursor-pointer rounded-sm border-0 bg-transparent p-0 text-left focus:outline-none focus:ring-1 focus:ring-[#2383e6]"
                        >
                          <span className="font-medium text-app-text-primary">{out.headline}</span>
                          <span className="ml-2 rounded-sm bg-transparent px-1.5 py-0.5 text-xs text-app-text-secondary">{getPieceTypeDisplayLabel(out.format)}</span>
                          <span className="ml-2 text-xs text-app-text-tertiary">In: {PIECE_STATE_LABELS[out.state] ?? out.state}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!id || !confirm(`Unlink "${out.headline}" from this story? The piece will stay in the database and on the board.`)) return;
                            try {
                              await piecesApi.update(out._id, { linkedStoryIds: otherLinkedIds });
                              if (editingPieceId === out._id) setEditingPieceId(null);
                              await fetchPieces();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to unlink piece');
                            }
                          }}
                          className="shrink-0 rounded-sm border-0 bg-transparent px-2 py-1 text-sm text-app-text-secondary hover:bg-app-bg-elevated hover:text-app-text-primary"
                        >
                          Unlink
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddPiece(true); setAddPieceFormat(addPieceDefaultFormat); setAddPieceHeadline(addPieceTemplateHeadline(addPieceDefaultFormat)); }}
                    className="rounded-sm border-0 bg-transparent px-3 py-2 text-sm font-medium text-app-text-primary hover:border-transparent hover:bg-transparent"
                  >
                    + Add piece
                  </button>
                </div>
                {showAddPiece && (
                  <div className="rounded-sm border-0 bg-transparent p-4">
                    <h4 className="mb-3 text-sm font-medium text-app-text-primary">New content piece</h4>
                    {story?.researchNotes != null && story.researchNotes.trim() !== '' && (
                      <div className="mb-3 rounded border border-app-border bg-app-bg-secondary p-3">
                        <p className="mb-1.5 text-xs font-medium text-app-text-secondary">Research (this story)</p>
                        <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-app-text-primary">{story.researchNotes}</div>
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="mb-1 block text-xs text-app-text-secondary">Format</label>
                      <select
                        value={addPieceFormat}
                        onChange={(e) => {
                          const fmt = e.target.value;
                          setAddPieceFormat(fmt);
                          setAddPieceHeadline(addPieceTemplateHeadline(fmt));
                        }}
                        className="w-full rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm text-app-text-primary focus:border-[#2383e6] focus:outline-none"
                      >
                        {getAvailablePieceTypes().map((f) => (
                          <option key={f} value={f}>{getPieceTypeDisplayLabel(f)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="mb-1 block text-xs text-app-text-secondary">Headline</label>
                      <input type="text" value={addPieceHeadline} onChange={(e) => setAddPieceHeadline(e.target.value)} placeholder="e.g. Housing crisis – Reels cut" className="w-full rounded-sm border-0 bg-transparent px-2 py-1.5 text-sm text-app-text-primary placeholder:text-app-text-tertiary focus:border-[#2383e6] focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowAddPiece(false)} className="rounded-sm border-0 bg-transparent px-3 py-1.5 text-sm text-app-text-primary hover:border-transparent hover:bg-transparent">Cancel</button>
                      <button
                        type="button"
                        disabled={!addPieceHeadline.trim() || creatingPiece}
                        onClick={async () => {
                          if (!id || !addPieceHeadline.trim()) return;
                          setCreatingPiece(true);
                          try {
                            await piecesApi.create(id, { format: addPieceFormat, headline: addPieceHeadline.trim() });
                            await fetchPieces();
                            setShowAddPiece(false);
                            setAddPieceHeadline('');
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to create piece');
                          } finally {
                            setCreatingPiece(false);
                          }
                        }}
                        className="rounded-sm bg-[#2383e6] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {creatingPiece ? 'Creating…' : 'Create'}
                      </button>
                    </div>
                  </div>
                )}
                {editingPieceId && (() => {
                  const out = pieces.find((o) => o._id === editingPieceId);
                  if (!out) return null;
                  return (
                    <div className="mt-6 border-0 pt-4">
                      <div className="mb-3 flex items-center justify-between rounded-sm border-0 bg-transparent px-3 py-2 text-sm text-app-text-primary transition-[border-color,background-color] group/scriptbar hover:border-transparent hover:bg-transparent">
                        <span>Editing script: <strong>{out.headline}</strong> ({getPieceTypeDisplayLabel(out.format)})</span>
                        <button type="button" onClick={() => setEditingPieceId(null)} className="rounded-sm border-0 bg-transparent px-2 py-1 text-[#2383e6] hover:border-transparent hover:bg-transparent">Done</button>
                      </div>
                      <ScriptEditor
                        ref={scriptEditorRef}
                        storyId={story._id}
                        pieceId={editingPieceId}
                        currentUserId={user?._id ?? ''}
                        initialContentWhenEmpty={getPieceTypeTemplate(out.format)?.script ?? ''}
                        onAddFactCheck={handleAddFactCheck}
                        onDirty={markDirty}
                      />
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddPiece(true); setAddPieceFormat(addPieceDefaultFormat); setAddPieceHeadline(addPieceTemplateHeadline(addPieceDefaultFormat)); }}
                  className="rounded-sm border-0 bg-transparent px-3 py-2 text-sm font-medium text-app-text-primary hover:border-transparent hover:bg-transparent"
                >
                  + Add piece
                </button>
              </div>
            )}
          </div>
        )}

        {/* Full-page: Export, user, sign out */}
        {!isModal && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="text-sm text-app-text-secondary">{user?.email}</span>
            <button type="button" onClick={() => logout()} className="rounded-sm px-3 py-1.5 text-sm text-app-text-primary hover:bg-transparent">Sign out</button>
          </div>
        )}
      </div>

      {factCheckModal && (
        <AddFactCheckModal
          selection={factCheckModal.selection}
          onClose={() => setFactCheckModal(null)}
          onSubmit={handleSubmitFactCheck}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal onClose={() => setShowAssignmentModal(false)} onConfirm={handleAssignmentConfirm} />
      )}
      {showRejectModal && (
        <RejectModal
          ideaHeadline={story.headline}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleRejectConfirm}
        />
      )}
      {showParkModal && (
        <ParkModal
          ideaHeadline={story.headline}
          onClose={() => setShowParkModal(false)}
          onConfirm={handleParkConfirm}
        />
      )}

    </div>
  );
});

export default StoryDetail;
