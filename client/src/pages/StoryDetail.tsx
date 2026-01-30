import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { STORY_STATES, STATE_DISPLAY_LABELS, getStateDisplayLabel, normalizeStateKey, type Story, type StoryState, type StoryChecklistItem, type StoryDeadline, type UserRef } from '../types/story';
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

const TABS = ['Script', 'Research', 'Media', 'Activity'] as const;
type Tab = (typeof TABS)[number];

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

export default function StoryDetail({ isModal, storyId: storyIdProp, onClose }: StoryDetailProps = {}) {
  const paramsId = useParams<{ id: string }>().id;
  const id = isModal && storyIdProp ? storyIdProp : paramsId;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Script');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
  const [factCheckModal, setFactCheckModal] = useState<{ selection: { start: number; end: number; text: string } } | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [users, setUsers] = useState<Pick<User, '_id' | 'name' | 'email' | 'role'>[]>([]);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newDeadline, setNewDeadline] = useState({ name: '', date: '' });
  const [newCommentText, setNewCommentText] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [related, setRelated] = useState<{ parentStory: Story | null; relatedStories: Story[] } | null>(null);
  const [parentStories, setParentStories] = useState<Story[]>([]);
  const [newRoleAssignment, setNewRoleAssignment] = useState<RoleAssignment | null>(null);
  const [lastSavedStory, setLastSavedStory] = useState<Story | null>(null);
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
    if (!id) return;
    activityApi.getByStoryId(id).then((res) => setActivity(res.activity)).catch(() => setActivity([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    factChecksApi.list(id).then((res) => setFactChecks(res.factChecks)).catch(() => setFactChecks([]));
  }, [id]);

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

  const handleUpdateStory = useCallback(
    async (
      updates: Partial<
        Pick<
          Story,
          | 'headline'
          | 'description'
          | 'state'
          | 'categories'
          | 'deadlines'
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
    state: s.state,
    categories: s.categories,
    deadlines: s.deadlines,
    checklist: s.checklist,
    researchNotes: s.researchNotes,
    parentStoryId: s.parentStoryId,
    teamMembers: s.teamMembers,
  }), []);

  const hasUnsavedChanges = dirtyRef.current;

  const handleSaveAll = useCallback(async () => {
    if (!story || saving) return;
    if (hasUnsavedChanges) {
      await handleUpdateStory(getSavePayload(story));
    }
    await scriptEditorRef.current?.saveDraft?.();
  }, [story, hasUnsavedChanges, saving, handleUpdateStory, getSavePayload]);

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
      const scriptContent = res.content ?? '';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(story.headline)}</title></head><body>
<h1>${escape(story.headline)}</h1>
<h2>Description</h2>
<p>${escape(story.description)}</p>
<h2>Script</h2>
<div>${scriptContent || '(No script content)'}</div>
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
      await factChecksApi.create(id, {
        scriptVersion: story.currentScriptVersion ?? 0,
        textSelection: factCheckModal.selection,
        type: data.type,
        note: data.note,
      });
      const res = await factChecksApi.list(id);
      setFactChecks(res.factChecks);
      setFactCheckModal(null);
    },
    [id, story, factCheckModal]
  );

  const suggestedNextSteps = useMemo(() => {
    if (!story) return null;
    const state = (normalizeStateKey(story.state) || (story.state as string)?.toLowerCase?.() || '') as StoryState;
    const pendingFactChecks = factChecks.filter((f) => f.status === 'pending').length;
    const checklistTotal = story.checklist?.length ?? 0;
    const checklistDone = story.checklist?.filter((c) => c.completed).length ?? 0;
    if (state === 'idea') return 'Add a description and move to Research when ready.';
    if (state === 'research') return 'Add research notes in the Research tab, then move to Scripting.';
    if (state === 'scripting') {
      if (pendingFactChecks > 0) return `${pendingFactChecks} fact-check(s) pending — resolve in Script tab or sidebar.`;
      return 'Draft in Script tab. Add fact-checks for claims that need verification.';
    }
    if (state === 'multimedia') return 'Add media and attachments in the Media tab (upload coming soon).';
    if (state === 'finalization') {
      if (pendingFactChecks > 0) return `${pendingFactChecks} fact-check(s) pending — resolve before publishing.`;
      if (checklistTotal > 0 && checklistDone < checklistTotal) return 'Complete checklist and resolve fact-checks before publishing.';
      return 'Review script and checklist, then use Publish when ready.';
    }
    if (state === 'published') return 'Story is published.';
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

  const handleAddDeadline = useCallback(() => {
    const name = newDeadline.name.trim();
    if (!name || !story) return;
    const date = newDeadline.date || new Date().toISOString().slice(0, 10);
    const current = story.deadlines ?? [];
    const next: StoryDeadline[] = [...current, { name, date, completed: false }];
    handleUpdateStory({ deadlines: next });
    setNewDeadline({ name: '', date: '' });
  }, [story, newDeadline, handleUpdateStory]);

  const handleDeadlineToggleComplete = useCallback(
    (index: number) => {
      if (!story?.deadlines) return;
      const next = story.deadlines.map((d, i) => (i === index ? { ...d, completed: !d.completed } : d));
      handleUpdateStory({ deadlines: next });
    },
    [story, handleUpdateStory]
  );

  const handleRemoveDeadline = useCallback(
    (index: number) => {
      if (!story?.deadlines) return;
      const next = story.deadlines.filter((_, i) => i !== index);
      handleUpdateStory({ deadlines: next });
    },
    [story, handleUpdateStory]
  );

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

  const handleConfirmPublish = useCallback(() => {
    handleUpdateStory({ state: 'published' });
    setPublishModalOpen(false);
  }, [handleUpdateStory]);

  const pendingFactCount = factChecks.filter((f) => f.status === 'pending').length;
  const checklistIncomplete = (story?.checklist?.length ?? 0) > 0 && (story?.checklist?.filter((c) => c.completed).length ?? 0) < (story?.checklist?.length ?? 0);

  const BackOrClose = isModal && onClose ? (
    <button
      type="button"
      onClick={onClose}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-app-text-secondary transition-colors duration-[120ms] hover:bg-app-bg-hover hover:text-app-text-primary"
      aria-label="Close"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5L5 15M5 5l10 10" />
      </svg>
    </button>
  ) : (
    <Link to="/board" className="text-app-text-secondary text-sm transition-colors duration-[120ms] hover:text-app-text-primary">← Board</Link>
  );

  if (loading && !story) {
    return (
      <div className={`flex flex-col bg-app-bg-primary ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
        <header className="border-b border-app-border-light bg-app-bg-primary px-6 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            {BackOrClose}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-6">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-app-border-light border-t-app-blue" />
          <span className="ml-2 text-app-text-secondary">Loading…</span>
        </main>
      </div>
    );
  }

  if (error && !story) {
    return (
      <div className={`flex flex-col bg-app-bg-primary ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
        <header className="border-b border-app-border-light bg-app-bg-primary px-6 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            {BackOrClose}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-6">
          <p className="text-app-red">{error}</p>
        </main>
      </div>
    );
  }

  if (!story) {
    return (
      <div className={`flex flex-col bg-app-bg-primary ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
        <header className="border-b border-app-border-light bg-app-bg-primary px-6 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            {BackOrClose}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center p-6">
          <p className="text-app-text-secondary">Story not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-app-bg-primary overflow-auto ${isModal ? 'h-full min-h-0' : 'min-h-screen'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 shrink-0 border-b border-app-border-light bg-app-bg-primary shadow-[var(--shadow-sm)] ${isModal ? 'px-3 py-2' : 'px-6 py-3'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {BackOrClose}
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={story.headline}
                onChange={(e) => {
                  setStory((s) => (s ? { ...s, headline: e.target.value } : s));
                  markDirty();
                }}
                onBlur={(e) => e.target.value !== story.headline && handleUpdateStory({ headline: e.target.value })}
                className="w-full truncate border-0 border-b border-transparent bg-transparent py-2 text-app-text-primary text-2xl font-semibold leading-tight outline-none transition-[background,padding] duration-[120ms] focus:bg-app-bg-hover focus:px-3 focus:rounded focus:-mx-3"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3 text-app-text-secondary text-sm">
                <select
                  value={normalizeStateKey(story.state) || story.state}
                  onChange={(e) => handleUpdateStory({ state: (e.target.value || '').toLowerCase() as StoryState })}
                  className="rounded border border-app-border-light bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm transition-all duration-[120ms] hover:border-app-border-medium focus:border-app-blue focus:outline-none"
                  aria-label="State"
                >
                  {STORY_STATES.map((s) => (
                    <option key={s} value={s}>{STATE_DISPLAY_LABELS[s]}</option>
                  ))}
                </select>
                {story.categories?.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded bg-app-bg-secondary pl-2 pr-1 py-0.5 text-app-text-secondary text-xs font-medium"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(c)}
                      className="rounded p-0.5 hover:bg-app-bg-hover hover:text-app-text-primary"
                      aria-label={`Remove ${c}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={handleAddCategory}
                  placeholder="+ Category"
                  className="w-24 rounded border border-app-border-light bg-app-bg-primary px-2 py-1 text-app-text-primary text-xs placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
                />
                {saving && <span className="text-app-text-tertiary text-xs">Saving…</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isModal && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || !hasUnsavedChanges}
                className="inline-flex items-center gap-1.5 rounded border-0 bg-app-accent-primary px-3 py-2 text-sm font-medium text-white transition-all duration-[120ms] ease-in hover:bg-app-accent-primary-hover disabled:cursor-default disabled:bg-app-bg-tertiary disabled:text-app-text-tertiary disabled:opacity-100 disabled:hover:opacity-100 disabled:hover:bg-app-bg-tertiary disabled:pointer-events-none"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            {normalizeStateKey(story.state) === 'finalization' && (
              <button
                type="button"
                onClick={() => setPublishModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded border-0 bg-app-blue px-3 py-2 text-white text-sm font-medium transition-all duration-[120ms] ease-in hover:opacity-90"
              >
                Publish
              </button>
            )}
            {!isModal && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded border-0 bg-app-bg-tertiary px-3 py-2 text-app-text-primary text-sm font-medium transition-all duration-[120ms] ease-in hover:bg-app-bg-hover"
                >
                  Export
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-md border border-app-border-light bg-app-bg-primary py-1.5 shadow-[var(--shadow-lg)]">
                      <button type="button" onClick={handlePrintPdf} className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-text-primary text-sm transition-colors duration-[120ms] hover:bg-app-bg-hover">
                        Print / Save as PDF
                      </button>
                      <button type="button" onClick={handleDownloadDocx} disabled={exporting} className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-text-primary text-sm transition-colors duration-[120ms] hover:bg-app-bg-hover disabled:opacity-50">
                        Download DOCX
                      </button>
                      <button type="button" onClick={handleDownloadHtml} disabled={exporting} className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-text-primary text-sm transition-colors duration-[120ms] hover:bg-app-bg-hover disabled:opacity-50">
                        Download HTML
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {!isModal && (
              <>
                <span className="text-app-text-secondary text-sm">{user?.email}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1.5 rounded border-0 bg-app-bg-tertiary px-3 py-2 text-app-text-primary text-sm font-medium transition-all duration-[120ms] ease-in hover:bg-app-bg-hover"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`mx-auto w-full max-w-[1400px] flex-1 ${isModal ? 'grid min-h-0 gap-3 overflow-hidden p-3' : 'flex gap-6 p-6 md:flex-col'}`} style={isModal ? { gridTemplateColumns: '7fr 3fr' } : undefined}>
        <div className={`min-w-0 ${isModal ? 'overflow-auto' : 'flex-1'}`}>
          <div className={`flex gap-1 border-b border-app-border-light ${isModal ? 'mb-3' : 'mb-6'}`}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-2 text-app-text-secondary text-sm font-medium transition-all duration-[120ms] ${
                  activeTab === tab
                    ? 'border-app-blue text-app-text-primary'
                    : 'border-transparent hover:bg-app-bg-hover hover:text-app-text-primary rounded-t'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {suggestedNextSteps && (
            <p className="mb-3 text-app-text-secondary text-sm">
              {suggestedNextSteps}
            </p>
          )}
          <div className={`rounded border border-app-border-light bg-app-bg-primary shadow-[var(--shadow-sm)] ${isModal ? 'p-3' : 'p-6'}`}>
            {activeTab === 'Script' && (
              <ScriptEditor
                ref={scriptEditorRef}
                storyId={story._id}
                currentUserId={user?._id ?? ''}
                onAddFactCheck={handleAddFactCheck}
              />
            )}
            {activeTab === 'Research' && (
              <div>
                <h2 className="mb-3 text-app-text-secondary text-xs font-semibold uppercase tracking-wide">Research notes</h2>
                <textarea
                  value={story.researchNotes ?? ''}
                  onChange={(e) => {
                  setStory((s) => (s ? { ...s, researchNotes: e.target.value } : s));
                  markDirty();
                }}
                  onBlur={(e) => handleUpdateStory({ researchNotes: e.target.value })}
                  className="min-h-[80px] w-full resize-y rounded border border-app-border-light bg-app-bg-primary px-3 py-2 text-app-text-primary text-sm leading-normal transition-all duration-[120ms] placeholder-app-text-tertiary hover:border-app-border-medium focus:border-app-blue focus:outline-none focus:ring-1 focus:ring-app-blue"
                  rows={8}
                  placeholder="Research notes and sources…"
                />
              </div>
            )}
            {activeTab === 'Media' && (
              <div>
                <h2 className="mb-3 text-app-text-secondary text-xs font-semibold uppercase tracking-wide">Media & attachments</h2>
                <p className="text-app-text-secondary text-sm">
                  Upload and attach images, video, or audio for this story. File storage (S3/R2) coming soon — you can paste links in Research notes for now.
                </p>
                <p className="mt-2 text-app-text-tertiary text-xs">Upload coming soon.</p>
              </div>
            )}
            {activeTab === 'Activity' && (
              <div>
                <h2 className="mb-3 text-app-text-secondary text-xs font-semibold uppercase tracking-wide">Activity</h2>
                {activity.length === 0 ? (
                  <p className="text-app-text-secondary mt-2">No activity yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {activity.map((a) => (
                      <li key={a._id} className="flex gap-2 text-app-text-primary text-sm">
                        <span className="text-app-text-secondary">
                          {(a.userId as { name?: string })?.name ?? 'User'} · {a.action}
                        </span>
                        <span className="text-app-text-tertiary">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: 3/10 in popup; on full page fixed width */}
        <aside className={`min-w-0 space-y-2 ${isModal ? 'overflow-auto border-l border-app-border-light pl-3' : 'w-80 shrink-0 space-y-3 md:w-full'}`}>
          {/* Overview */}
          <section className={`rounded border border-app-border-light bg-app-bg-primary ${isModal ? 'p-2' : 'p-4'}`}>
            <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide ${isModal ? 'mb-2' : 'mb-3'} flex items-center gap-1.5`}>Overview</h3>
            {story.kind !== 'parent' && (
              <div className={isModal ? 'mb-2' : 'mb-4'}>
                <h4 className="mb-1 text-app-text-tertiary text-xs font-medium">Part of series</h4>
                {!isModal && (
                  <p className="mb-2 text-app-text-tertiary text-xs">
                    Link to a series to group with related stories.
                  </p>
                )}
                <select
                  value={typeof story.parentStoryId === 'string' ? story.parentStoryId : (story.parentStoryId as { _id?: string })?._id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    handleUpdateStory({ parentStoryId: val || '' });
                  }}
                  className={`w-full rounded border border-app-border-light bg-app-bg-primary text-app-text-primary focus:border-app-blue focus:outline-none ${isModal ? 'px-1.5 py-1 text-xs' : 'px-2 py-1.5 text-sm'}`}
                >
                  <option value="">None</option>
                  {parentStories.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.headline}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <h4 className="mb-1 text-app-text-tertiary text-xs font-medium">Description</h4>
              <textarea
                value={story.description}
                onChange={(e) => {
                  setStory((s) => (s ? { ...s, description: e.target.value } : s));
                  markDirty();
                }}
                onBlur={(e) => e.target.value !== story.description && handleUpdateStory({ description: e.target.value })}
                className={`w-full resize-y rounded border border-app-border-light bg-app-bg-primary px-1.5 py-1 text-app-text-primary leading-normal transition-all duration-[120ms] placeholder-app-text-tertiary hover:border-app-border-medium focus:border-app-blue focus:outline-none focus:ring-1 focus:ring-app-blue ${isModal ? 'min-h-[60px] text-xs' : 'min-h-[80px] px-2 py-1.5 text-sm'}`}
                rows={isModal ? 3 : 5}
                minLength={140}
              />
              <p className="mt-0.5 text-app-text-tertiary text-xs">{story.description.length} characters (min 140)</p>
            </div>
          </section>
          <section className={`rounded border border-app-border-light bg-app-bg-secondary ${isModal ? 'p-2' : 'p-4'}`}>
            <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${isModal ? 'mb-2' : 'mb-3'}`}>Role assignments</h3>
            <p className="mb-3 text-app-text-tertiary text-xs">Assign people to roles. You can add multiple people per role. Manage role types in <Link to="/preferences" className="text-app-blue underline hover:no-underline">Preferences</Link>.</p>
            <div className="space-y-2 text-sm">
              {(() => {
                const assignments = buildAssignmentsFromStory(story);
                const rows = newRoleAssignment ? [...assignments, newRoleAssignment] : assignments;
                const updateAssignments = (next: RoleAssignment[]) => {
                  const valid = next.filter((a) => a.role && a.userId);
                  handleUpdateStory({ teamMembers: valid });
                  setNewRoleAssignment(null);
                };
                const predefinedSet = new Set(ROLE_OPTIONS);
                const customFromPrefs = loadCustomRoleTypes();
                const customFromStory = rows.map((r) => r.role).filter((role) => role && !predefinedSet.has(role as (typeof ROLE_OPTIONS)[number]));
                const customRoles = Array.from(new Set([...customFromPrefs, ...customFromStory])).sort();
                const removedRoleTypes = loadRemovedRoleTypes();
                const rolesInUse = rows.map((r) => r.role).filter(Boolean);
                const removedButInUse = removedRoleTypes.filter((r) => rolesInUse.includes(r));
                const roleOptions = [
                  ...ROLE_OPTIONS.filter((r) => !removedRoleTypes.includes(r)),
                  ...customRoles.filter((r) => !removedRoleTypes.includes(r)),
                  ...removedButInUse,
                  CUSTOM_ROLE_PLACEHOLDER,
                ];

                return (
                  <>
                    {rows.map((row, i) => {
                      const isNew = Boolean(newRoleAssignment && i === rows.length - 1);
                      const isCustomRole = row.role && !predefinedSet.has(row.role as (typeof ROLE_OPTIONS)[number]);
                      const showCustomInput = isCustomRole || row.role === '' || row.role === CUSTOM_ROLE_PLACEHOLDER;
                      const selectValue =
                        row.role && (predefinedSet.has(row.role as (typeof ROLE_OPTIONS)[number]) || customRoles.includes(row.role))
                          ? row.role
                          : CUSTOM_ROLE_PLACEHOLDER;
                      return (
                        <div key={isNew ? 'new' : `${row.role}-${row.userId}-${i}`} className="flex flex-wrap items-center gap-2">
                          <select
                            value={selectValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === CUSTOM_ROLE_PLACEHOLDER) {
                                if (isNew) {
                                  setNewRoleAssignment((prev) => (prev ? { ...prev, role: '' } : { role: '', userId: '' }));
                                } else {
                                  const next = assignments.map((a, j) => (j === i ? { ...a, role: '' } : a));
                                  updateAssignments(next);
                                }
                              } else {
                                if (isNew) {
                                  setNewRoleAssignment((prev) => (prev ? { ...prev, role: value } : { role: value, userId: '' }));
                                } else {
                                  const next = assignments.map((a, j) => (j === i ? { ...a, role: value } : a));
                                  updateAssignments(next);
                                }
                              }
                            }}
                            className="min-w-0 flex-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm focus:border-app-blue focus:outline-none"
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          {showCustomInput ? (
                            <input
                              type="text"
                              value={row.role && row.role !== CUSTOM_ROLE_PLACEHOLDER ? row.role : ''}
                              onChange={(e) => {
                                const role = e.target.value.trim();
                                if (isNew) {
                                  const nextRole = role || '';
                                  setNewRoleAssignment((prev) => (prev ? { ...prev, role: nextRole } : { role: nextRole, userId: '' }));
                                  if (nextRole && row.userId) {
                                    updateAssignments([...assignments, { role: nextRole, userId: row.userId }]);
                                  }
                                } else {
                                  const next = assignments.map((a, j) => (j === i ? { ...a, role: role || '' } : a));
                                  updateAssignments(next);
                                }
                              }}
                              placeholder="Type custom role"
                              className="min-w-0 flex-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
                            />
                          ) : null}
                          <select
                            value={row.userId}
                            onChange={(e) => {
                              const userId = e.target.value;
                              if (isNew) {
                                if (userId && row.role) {
                                  updateAssignments([...assignments, { role: row.role, userId }]);
                                } else if (userId) {
                                  setNewRoleAssignment((prev) => (prev ? { ...prev, userId } : null));
                                } else {
                                  setNewRoleAssignment((prev) => (prev ? { ...prev, userId: '' } : null));
                                }
                              } else {
                                const next = assignments.map((a, j) => (j === i ? { ...a, userId } : a));
                                updateAssignments(next);
                              }
                            }}
                            className="min-w-0 flex-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm focus:border-app-blue focus:outline-none"
                          >
                            <option value="">— Select person —</option>
                            {users.map((u) => (
                              <option key={u._id} value={u._id}>{u.name || u.email}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (isNew) {
                                setNewRoleAssignment(null);
                              } else {
                                updateAssignments(assignments.filter((_, j) => j !== i));
                              }
                            }}
                            className="shrink-0 rounded p-1.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-red"
                            aria-label={isNew ? 'Cancel add' : 'Remove'}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    {!newRoleAssignment && (
                      <button
                        type="button"
                        onClick={() => setNewRoleAssignment({ role: 'Producer', userId: '' })}
                        className="rounded border border-app-border-light bg-app-bg-tertiary px-2 py-1 text-app-text-primary text-sm hover:bg-app-bg-hover"
                      >
                        + Add assignment
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
          <section className={`rounded border border-app-border-light bg-app-bg-secondary ${isModal ? 'p-2' : 'p-4'}`}>
            <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${isModal ? 'mb-2' : 'mb-3'}`}>Deadlines</h3>
            {story.deadlines?.length ? (
              <ul className="space-y-2 text-app-text-primary text-sm">
                {story.deadlines.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={d.completed ?? false}
                      onChange={() => handleDeadlineToggleComplete(i)}
                      className="h-4 w-4 shrink-0 rounded border-app-border-medium"
                    />
                    <span className={d.completed ? 'text-app-text-tertiary line-through' : ''}>{d.name}: {new Date(d.date).toLocaleDateString()}</span>
                    <button type="button" onClick={() => handleRemoveDeadline(i)} className="ml-auto rounded p-0.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-red" aria-label="Remove">×</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-app-text-secondary text-sm">No deadlines.</p>
            )}
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={newDeadline.name}
                onChange={(e) => setNewDeadline((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="min-w-0 flex-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
              />
              <input
                type="date"
                value={newDeadline.date}
                onChange={(e) => setNewDeadline((prev) => ({ ...prev, date: e.target.value }))}
                className="rounded border border-app-border-light bg-app-bg-primary px-2 py-1 text-app-text-primary text-sm focus:border-app-blue focus:outline-none"
              />
              <button type="button" onClick={handleAddDeadline} disabled={!newDeadline.name.trim()} className="rounded border border-app-border-light bg-app-bg-tertiary px-2 py-1 text-app-text-primary text-sm hover:bg-app-bg-hover disabled:opacity-50">Add</button>
            </div>
          </section>
          <section className={`rounded border border-app-border-light bg-app-bg-secondary ${isModal ? 'p-2' : 'p-4'}`}>
            <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${isModal ? 'mb-2' : 'mb-3'}`}>Checklist</h3>
            {story.checklist?.length ? (
              <ul className="space-y-1 text-app-text-primary text-sm">
                {story.checklist.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={c.completed}
                      onChange={() => handleChecklistToggle(i)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[1.5px] border-app-border-medium transition-colors duration-[120ms] hover:border-app-blue checked:border-app-blue checked:bg-app-blue"
                    />
                    <span className={c.completed ? 'text-app-text-tertiary line-through' : ''}>{c.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-app-text-secondary text-sm">No checklist items.</p>
            )}
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Add item"
                className="min-w-0 flex-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
              />
              <button type="button" onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()} className="rounded border border-app-border-light bg-app-bg-tertiary px-2 py-1 text-app-text-primary text-sm hover:bg-app-bg-hover disabled:opacity-50">Add</button>
            </div>
          </section>
          <section className={`rounded border border-app-border-light bg-app-bg-secondary ${isModal ? 'p-2' : 'p-4'}`}>
            <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${isModal ? 'mb-2' : 'mb-3'}`}>Fact-checks</h3>
            <div>
              <FactCheckList factChecks={factChecks} />
            </div>
          </section>
          <section className={`rounded border border-app-border-light bg-app-bg-secondary ${isModal ? 'p-2' : 'p-4'}`}>
            <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${isModal ? 'mb-2' : 'mb-3'}`}>Comments</h3>
            {comments.length === 0 ? (
              <p className="text-app-text-secondary text-sm">No comments yet.</p>
            ) : (
              <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-app-text-primary text-sm">
                {comments.map((c) => (
                  <li key={c._id} className="rounded bg-app-bg-primary p-2">
                    <span className="text-app-text-secondary text-xs">{(c.userId as { name?: string })?.name ?? 'User'}</span>
                    <p className="mt-0.5 whitespace-pre-wrap">{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="w-full resize-y rounded border border-app-border-light bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newCommentText.trim() || submittingComment}
              className="mt-2 rounded border border-app-border-light bg-app-bg-tertiary px-2 py-1 text-app-text-primary text-sm hover:bg-app-bg-hover disabled:opacity-50"
            >
              {submittingComment ? 'Sending…' : 'Add comment'}
            </button>
          </section>
          {related && (related.parentStory || related.relatedStories.length > 0) && (
            <section className={`rounded border border-app-border-light bg-app-bg-secondary ${isModal ? 'p-2' : 'p-4'}`}>
              <h3 className={`text-app-text-secondary text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${isModal ? 'mb-2' : 'mb-3'}`}>Related stories</h3>
              {related.parentStory && (
                <p className={`mb-2 text-app-text-secondary ${isModal ? 'text-xs' : 'text-sm'}`}>
                  Part of series:{' '}
                  <Link to={`/story/${related.parentStory._id}`} className="text-app-blue underline hover:no-underline">
                    {related.parentStory.headline}
                  </Link>
                </p>
              )}
              <ul className="space-y-2">
                {related.relatedStories.map((s) => {
                  const isCurrent = s._id === story._id;
                  const status = s.archivedAt ? 'Archived' : normalizeStateKey(s.state) === 'published' ? 'Published' : getStateDisplayLabel(s.state);
                  return (
                    <li key={s._id} className={`flex items-center justify-between gap-2 rounded border px-2 py-1.5 ${isModal ? 'text-xs' : 'text-sm'} ${isCurrent ? 'border-app-blue bg-app-bg-secondary' : 'border-app-border-light bg-app-bg-primary'}`}>
                      {isCurrent ? (
                        <span className="min-w-0 flex-1 truncate font-medium text-app-text-primary">{s.headline}</span>
                      ) : (
                        <Link to={`/story/${s._id}`} className="min-w-0 flex-1 truncate text-app-blue hover:underline">{s.headline}</Link>
                      )}
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${s.archivedAt ? 'bg-app-bg-tertiary text-app-text-secondary' : normalizeStateKey(s.state) === 'published' ? 'bg-[#27AE60]/20 text-[#27AE60]' : 'bg-app-bg-tertiary text-app-text-secondary'}`}>{status}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </main>

      {isModal && (
        <footer className="shrink-0 border-t border-app-border-light bg-app-bg-primary px-6 py-3">
          <div className="mx-auto flex max-w-[1400px] justify-end">
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded border-0 bg-app-bg-tertiary px-3 py-2 text-app-text-primary text-sm font-medium transition-all duration-[120ms] ease-in hover:bg-app-bg-hover"
              >
                Export
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} aria-hidden />
                  <div className="absolute right-0 bottom-full z-20 mb-1 min-w-[180px] rounded-md border border-app-border-light bg-app-bg-primary py-1.5 shadow-[var(--shadow-lg)]">
                    <button type="button" onClick={handlePrintPdf} className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-text-primary text-sm transition-colors duration-[120ms] hover:bg-app-bg-hover">
                      Print / Save as PDF
                    </button>
                    <button type="button" onClick={handleDownloadDocx} disabled={exporting} className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-text-primary text-sm transition-colors duration-[120ms] hover:bg-app-bg-hover disabled:opacity-50">
                      Download DOCX
                    </button>
                    <button type="button" onClick={handleDownloadHtml} disabled={exporting} className="flex w-full items-center gap-2 px-3 py-2 text-left text-app-text-primary text-sm transition-colors duration-[120ms] hover:bg-app-bg-hover disabled:opacity-50">
                      Download HTML
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </footer>
      )}

      {factCheckModal && (
        <AddFactCheckModal
          selection={factCheckModal.selection}
          scriptVersion={story.currentScriptVersion ?? 0}
          onClose={() => setFactCheckModal(null)}
          onSubmit={handleSubmitFactCheck}
        />
      )}

      {publishModalOpen && (
        <>
          <div className="fixed inset-0 z-[1000] bg-black/40" onClick={() => setPublishModalOpen(false)} aria-hidden />
          <div className="fixed left-1/2 top-1/2 z-[1001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-app-border-light bg-app-bg-primary p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
            <h2 id="publish-modal-title" className="text-app-text-primary text-lg font-semibold">Publish story</h2>
            <p className="mt-2 text-app-text-secondary text-sm">
              Move this story to <strong>Published</strong>? This action is final; you can change state back from the header if needed.
            </p>
            {(pendingFactCount > 0 || checklistIncomplete) && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                {pendingFactCount > 0 && <p>{pendingFactCount} fact-check(s) still pending.</p>}
                {checklistIncomplete && <p>Checklist is not fully completed.</p>}
                <p className="mt-1">You can still publish; resolve these before going live if needed.</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="rounded border border-app-border-light bg-app-bg-tertiary px-3 py-2 text-app-text-primary text-sm hover:bg-app-bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="rounded border-0 bg-app-blue px-3 py-2 text-white text-sm font-medium hover:opacity-90"
              >
                Publish
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
