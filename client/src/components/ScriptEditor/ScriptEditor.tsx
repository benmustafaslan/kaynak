import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { scriptVersionsApi } from '../../utils/scriptVersionsApi';

const AUTO_SAVE_INTERVAL_MS = 10 * 1000;

export interface ScriptEditorHandle {
  saveDraft: () => Promise<void>;
}

interface ScriptEditorProps {
  storyId: string;
  currentUserId: string;
  onAddFactCheck?: (selection: { start: number; end: number; text: string }) => void;
  onDirty?: () => void;
  readOnly?: boolean;
}

export const ScriptEditor = forwardRef<ScriptEditorHandle, ScriptEditorProps>(function ScriptEditor(
  { storyId, currentUserId: _currentUserId, onAddFactCheck, onDirty, readOnly },
  ref
) {
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lockHeld, setLockHeld] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAcquiredLock = useRef(false);
  const lockHeldRef = useRef(false);
  const contentRef = useRef(content);
  contentRef.current = content;
  lockHeldRef.current = lockHeld;

  const fetchCurrent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await scriptVersionsApi.getCurrent(storyId);
      setContent(res.content ?? '');
      setVersion(res.version ?? 0);
      setLocked(res.locked ?? false);
      setLockedBy(res.lockedBy ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load script');
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const acquireLock = useCallback(async () => {
    try {
      await scriptVersionsApi.acquireLock(storyId);
      setLockHeld(true);
      setLocked(true);
      setLockedBy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not acquire lock');
    }
  }, [storyId]);

  const releaseLock = useCallback(async () => {
    try {
      await scriptVersionsApi.releaseLock(storyId);
      setLockHeld(false);
      setLocked(false);
      setLockedBy(null);
    } catch {
      // ignore
    }
  }, [storyId]);

  useEffect(() => {
    if (readOnly || locked) return;
    if (!lockHeld && !loading) {
      hasAcquiredLock.current = true;
      acquireLock();
    }
    return () => {
      if (hasAcquiredLock.current) {
        const doSaveThenRelease = async () => {
          if (lockHeldRef.current) {
            try {
              await scriptVersionsApi.saveDraft(storyId, contentRef.current);
            } catch {
              // ignore
            }
          }
          await releaseLock();
          hasAcquiredLock.current = false;
        };
        doSaveThenRelease();
      }
    };
  }, [storyId, readOnly, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-app-blue underline underline-offset-[2px] hover:underline' } }),
      Placeholder.configure({ placeholder: 'Start writing the script…' }),
    ],
    content,
    editable: !readOnly && (lockHeld || !locked),
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      onDirty?.();
    },
    editorProps: {
      attributes: {
        class: 'min-h-[200px] max-w-none px-0 py-0 text-app-text-primary text-base leading-relaxed focus:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:mt-5 [&_h2]:mb-2.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_a]:text-app-blue [&_a]:underline [&_a]:underline-offset-[2px]',
      },
    },
  });

  useEffect(() => {
    if (!editor || content === undefined) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content]); // only when we load from server
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly && (lockHeld || !locked));
  }, [editor, readOnly, lockHeld, locked]);

  const saveDraft = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    setSaving(true);
    try {
      await scriptVersionsApi.saveDraft(storyId, html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [storyId, editor]);

  const saveAsNewVersion = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    setSaving(true);
    try {
      const res = await scriptVersionsApi.saveAsNewVersion(storyId, html);
      setVersion(res.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version');
    } finally {
      setSaving(false);
    }
  }, [storyId, editor]);

  useEffect(() => {
    if (readOnly || !lockHeld) return;
    saveDraft(); // save once when lock is acquired so changes persist sooner
    autoSaveTimerRef.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL_MS);
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [readOnly, lockHeld, saveDraft]);

  useImperativeHandle(ref, () => ({
    saveDraft,
  }), [saveDraft]);

  const handleAddFactCheck = useCallback(() => {
    if (!editor || !onAddFactCheck) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;
    onAddFactCheck({ start: from, end: to, text });
  }, [editor, onAddFactCheck]);

  if (loading) {
    return (
      <div className="rounded-md border border-app-border-light bg-app-bg-secondary p-6 text-app-text-tertiary">
        Loading script…
      </div>
    );
  }

  if (locked && !lockHeld && lockedBy) {
    return (
      <div className="rounded-md border border-app-border-light bg-app-bg-primary p-6">
        <div className="flex items-center gap-3 rounded-md border border-[#ffeaa7] bg-[#fff9e6] px-4 py-3 text-app-text-primary text-sm">
          <span className="text-[#b88400]" aria-hidden>🔒</span>
          <span className="flex-1">
            Script is being edited by <strong>{lockedBy.name}</strong>. Request edit access when they release the lock.
          </span>
        </div>
        <button
          type="button"
          onClick={fetchCurrent}
          className="mt-3 text-app-text-secondary text-sm underline underline-offset-2 transition-colors duration-[120ms] hover:text-app-text-primary"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {error && (
        <div className="border-b border-app-red/20 bg-red-50 px-4 py-2 text-app-red text-sm">
          {error}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-app-border-light bg-app-bg-secondary px-2 py-2">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1.5 text-app-text-secondary text-sm font-medium transition-all duration-[120ms] ${
            editor?.isActive('bold') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1.5 text-app-text-secondary text-sm italic transition-all duration-[120ms] ${
            editor?.isActive('italic') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Italic"
        >
          I
        </button>
        <span className="mx-1 text-app-border-medium">|</span>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('heading', { level: 1 }) ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('heading', { level: 2 }) ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <span className="mx-1 text-app-border-medium">|</span>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`rounded px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('bulletList') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setLink({ href: '' }).run()}
          className={`rounded px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('link') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Link"
        >
          Link
        </button>
        {onAddFactCheck && (
          <>
            <span className="mx-1 text-app-border-medium">|</span>
            <button
              type="button"
              onClick={handleAddFactCheck}
              className="rounded px-2 py-1.5 text-app-text-primary text-sm font-medium transition-all duration-[120ms] hover:bg-app-bg-hover"
              title="Add Fact-Check (select text first)"
            >
              Add Fact-Check
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-app-text-tertiary text-xs">v{version}</span>
          {saving && <span className="text-app-text-tertiary text-xs">Saving…</span>}
          <button
            type="button"
            onClick={saveAsNewVersion}
            disabled={saving}
            className="rounded border-0 bg-app-blue px-2 py-1.5 text-app-bg-primary text-sm font-medium transition-all duration-[120ms] ease-in hover:bg-app-blue-hover disabled:opacity-50"
          >
            Save as new version
          </button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});
