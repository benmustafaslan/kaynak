import { useState } from 'react';
import type { FactCheck } from '../../utils/factChecksApi';
import { LongTextField } from '../LongTextField';
import { ModalShell } from '../ModalShell';

interface AddFactCheckModalProps {
  selection: { start: number; end: number; text: string };
  onClose: () => void;
  onSubmit: (data: { type: FactCheck['type']; note: string }) => Promise<void>;
}

const TYPES: { value: FactCheck['type']; label: string }[] = [
  { value: 'claim', label: 'Claim' },
  { value: 'question', label: 'Question' },
  { value: 'source_needed', label: 'Source needed' },
];

export function AddFactCheckModal({ selection, onClose, onSubmit }: AddFactCheckModalProps) {
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
    <ModalShell variant="form" onRequestClose={onClose} zIndex={1000} contentClassName="max-w-md">
      <div className="modal-header">
        <h2 className="modal-title">Add Fact-Check</h2>
      </div>
      <div className="modal-body">
        <blockquote className="border-l-2 border-[var(--border)] pl-3 text-sm italic text-[var(--medium-gray)]">
          "{selection.text.slice(0, 200)}{selection.text.length > 200 ? '…' : ''}"
        </blockquote>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="form-label">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FactCheck['type'])}
              className="form-input"
              aria-label="Fact-check type"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <LongTextField
            label="Note"
            value={note}
            onChange={setNote}
            placeholder="Context or source to verify"
            rows={3}
            maxLength={2000}
            variant="form"
            labelSuffix="(optional)"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
