import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { scriptVersionsApi } from '../../utils/scriptVersionsApi';

const AUTO_SAVE_INTERVAL_MS = 10 * 1000;

/** Decode HTML entities so previously escaped script content (e.g. &lt;p&gt;) displays as HTML. */
function decodeScriptContent(html: string): string {
  if (!html || !html.includes('&')) return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.innerHTML;
}

/** If template looks like plain text (no tags), wrap each line in <p> and escape; otherwise use as HTML. */
function normalizeTemplateContent(text: string): string {
  const t = text.trim();
  if (!t) return '';
  if (t.includes('<')) return t;
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return t.split(/\n/).map((line) => `<p>${escape(line)}</p>`).join('');
}

export interface ScriptEditorHandle {
  saveDraft: () => Promise<void>;
}

interface ScriptEditorProps {
  storyId: string;
  /** When set, edits the script for this piece (e.g. Reels) instead of the story's main script. */
  pieceId?: string;
  currentUserId: string;
  /** When the server returns empty content (no script version yet), use this as initial content (e.g. from piece type template). */
  initialContentWhenEmpty?: string;
  onAddFactCheck?: (selection: { start: number; end: number; text: string }) => void;
  onDirty?: () => void;
  readOnly?: boolean;
}

export const ScriptEditor = forwardRef<ScriptEditorHandle, ScriptEditorProps>(function ScriptEditor(
  { storyId, pieceId, currentUserId: _currentUserId, initialContentWhenEmpty, onAddFactCheck, onDirty, readOnly },
  ref
) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const hasValidContext = Boolean(pieceId || (storyId && String(storyId).trim()));

  const fetchCurrent = useCallback(async () => {
    if (!hasValidContext) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await scriptVersionsApi.getCurrent(storyId, pieceId);
      const raw = res.content ?? '';
      const decoded = raw.includes('&lt;') || raw.includes('&amp;') ? decodeScriptContent(raw) : raw;
      const final =
        decoded.trim() === '' && initialContentWhenEmpty?.trim()
          ? normalizeTemplateContent(initialContentWhenEmpty)
          : decoded;
      setContent(final);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load script');
    } finally {
      setLoading(false);
    }
  }, [storyId, pieceId, hasValidContext, initialContentWhenEmpty]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-app-blue underline underline-offset-[2px] hover:underline' } }),
      Placeholder.configure({ placeholder: 'Start writing the script…' }),
      Underline,
      Highlight.configure({ HTMLAttributes: { class: 'bg-amber-200/80 dark:bg-amber-600/30 rounded px-0.5' } }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      onDirty?.();
    },
    editorProps: {
      attributes: {
        class: 'min-h-[200px] max-w-none px-0 py-0 text-app-text-primary text-base leading-relaxed focus:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:mt-5 [&_h2]:mb-2.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_a]:text-app-blue [&_a]:underline [&_a]:underline-offset-[2px] [&_mark]:bg-amber-200/80 [&_mark]:dark:bg-amber-600/30 [&_mark]:rounded [&_code]:bg-app-bg-tertiary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
      },
    },
  });

  useEffect(() => {
    if (!editor || content === undefined) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content]);

  const saveDraft = useCallback(async () => {
    if (!editor || !hasValidContext) return;
    const html = editor.getHTML();
    setSaving(true);
    try {
      await scriptVersionsApi.saveDraft(storyId, html, pieceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [storyId, pieceId, editor, hasValidContext]);

  useEffect(() => {
    if (readOnly) return;
    autoSaveTimerRef.current = setInterval(saveDraft, AUTO_SAVE_INTERVAL_MS);
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [readOnly, saveDraft]);

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
      <div className="rounded-sm border-0 bg-app-bg-secondary p-6 text-app-text-tertiary">
        Loading script…
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {error && (
        <div className="border-0 bg-red-900/30 border border-red-800/50 px-4 py-2 text-app-red text-sm">
          {error}
        </div>
      )}
      {/* Toolbar – full width */}
      <div className="flex w-full flex-nowrap items-center gap-1 border-0 bg-app-bg-secondary px-2 py-2">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm font-medium transition-all duration-[120ms] ${
            editor?.isActive('bold') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm italic transition-all duration-[120ms] ${
            editor?.isActive('italic') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('underline') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] line-through ${
            editor?.isActive('strike') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Strikethrough"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHighlight().run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('highlight') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Highlight"
        >
          <span className="bg-amber-200/80 dark:bg-amber-600/30 px-1 rounded">H</span>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm font-mono transition-all duration-[120ms] ${
            editor?.isActive('code') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Inline code"
        >
          &lt;/&gt;
        </button>
        <span className="mx-1 text-app-border-medium">|</span>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('heading', { level: 1 }) ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
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
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
            editor?.isActive('bulletList') ? 'bg-app-bg-hover text-app-blue' : 'hover:bg-app-bg-hover hover:text-app-text-primary'
          }`}
          title="List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().setLink({ href: '' }).run()}
          className={`rounded-sm px-2 py-1.5 text-app-text-secondary text-sm transition-all duration-[120ms] ${
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
              className="rounded-sm px-2 py-1.5 text-app-text-primary text-sm font-medium transition-all duration-[120ms] hover:bg-app-bg-hover"
              title="Add Fact-Check (select text first)"
            >
              Add Fact-Check
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {saving && <span className="text-app-text-tertiary text-xs">Saving…</span>}
          {!readOnly && (
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-sm bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm font-medium transition-all duration-[120ms] hover:bg-app-bg-hover disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});
