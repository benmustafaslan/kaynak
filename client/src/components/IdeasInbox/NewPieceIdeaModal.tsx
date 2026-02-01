import { useState } from 'react';
import { piecesApi } from '../../utils/piecesApi';
import { getAvailablePieceTypes, getPieceTypeDisplayLabel } from '../../utils/pieceTypesPreferences';
import { ModalShell } from '../ModalShell';

interface NewPieceIdeaModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewPieceIdeaModal({ onClose, onCreated }: NewPieceIdeaModalProps) {
  const [headline, setHeadline] = useState('');
  const [format, setFormat] = useState<string>(() => getAvailablePieceTypes()[0] ?? 'other');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) {
      setError('Headline is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await piecesApi.createStandalone({
        format: format.trim() || 'other',
        headline: headline.trim(),
        state: 'scripting',
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create piece idea');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell variant="form" onRequestClose={onClose}>
      <div className="modal-header">
          <h2 className="modal-title">New piece idea</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label htmlFor="piece-idea-headline" className="block text-sm font-medium text-app-text-secondary mb-1">
                  Headline
                </label>
                <input
                  id="piece-idea-headline"
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full rounded border border-app-border bg-app-bg-primary px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent"
                  placeholder="e.g. Weekly recap Reels"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="piece-idea-format" className="block text-sm font-medium text-app-text-secondary mb-1">
                  Format
                </label>
                <select
                  id="piece-idea-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded border border-app-border bg-app-bg-primary px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent"
                >
                  {getAvailablePieceTypes().map((t) => (
                    <option key={t} value={t}>{getPieceTypeDisplayLabel(t)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Add piece idea'}
            </button>
          </div>
        </form>
    </ModalShell>
  );
}
