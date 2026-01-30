import { useState } from 'react';
import type { FactCheck } from '../../utils/factChecksApi';

interface AddFactCheckModalProps {
  selection: { start: number; end: number; text: string };
  scriptVersion: number;
  onClose: () => void;
  onSubmit: (data: { type: FactCheck['type']; note: string }) => Promise<void>;
}

const TYPES: { value: FactCheck['type']; label: string }[] = [
  { value: 'claim', label: 'Claim' },
  { value: 'question', label: 'Question' },
  { value: 'source_needed', label: 'Source needed' },
];

export function AddFactCheckModal({ selection, scriptVersion, onClose, onSubmit }: AddFactCheckModalProps) {
  const [type, setType] = useState<FactCheck['type']>('claim');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ type, note: note.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add fact-check');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-app-border-light bg-app-bg-primary p-6 shadow-[var(--shadow-lg)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-app-border-light pb-4">
          <h2 className="text-app-text-primary text-lg font-semibold">Add Fact-Check</h2>
          <p className="mt-1 text-app-text-secondary text-sm">Script version: {scriptVersion}</p>
        </div>
        <blockquote className="mt-4 border-l-2 border-app-border-light pl-3 text-app-text-secondary text-sm italic">
          "{selection.text.slice(0, 200)}{selection.text.length > 200 ? '…' : ''}"
        </blockquote>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-app-text-secondary text-xs font-medium uppercase tracking-wide">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FactCheck['type'])}
              className="w-full rounded border border-app-border-light bg-app-bg-primary px-3 py-2 pr-8 text-app-text-primary text-sm transition-all duration-[120ms] hover:border-app-border-medium focus:border-app-blue focus:outline-none"
              aria-label="Fact-check type"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-app-text-secondary text-xs font-medium uppercase tracking-wide">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] w-full resize-y rounded border border-app-border-light bg-app-bg-primary px-3 py-2 text-app-text-primary text-sm leading-normal transition-all duration-[120ms] placeholder-app-text-tertiary hover:border-app-border-medium focus:border-app-blue focus:outline-none focus:ring-1 focus:ring-app-blue"
              rows={3}
              maxLength={2000}
              placeholder="Context or source to verify"
            />
          </div>
          {error && <p className="text-app-red text-sm">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-app-border-light pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded border-0 bg-transparent px-3 py-2 text-app-text-secondary text-sm font-medium transition-all duration-[120ms] ease-in hover:bg-app-bg-hover hover:text-app-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded border-0 bg-app-blue px-3 py-2 text-app-bg-primary text-sm font-medium transition-all duration-[120ms] ease-in hover:bg-app-blue-hover disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
