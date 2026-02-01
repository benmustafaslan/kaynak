import { useState } from 'react';
import { BOARD_PIECE_STATES, BOARD_PIECE_STATE_LABELS } from '../../types/piece';
import { getAvailablePieceTypes, getPieceTypeDisplayLabel, getPieceTypeTemplate } from '../../utils/pieceTypesPreferences';
import { ModalShell } from '../ModalShell';

interface NewPieceModalProps {
  onClose: () => void;
  onSubmit: (data: { format: string; headline: string; state?: string }) => Promise<void>;
}

const FORMAT_OPTIONS = () => {
  const list = getAvailablePieceTypes();
  return list.length > 0 ? list : ['other'];
};

const applyTemplateHeadline = (fmt: string) => {
  const t = getPieceTypeTemplate(fmt);
  if (t?.headline != null && t.headline.trim() !== '') return t.headline.trim();
  return '';
};

export function NewPieceModal({ onClose, onSubmit }: NewPieceModalProps) {
  const initialFormat = FORMAT_OPTIONS()[0];
  const [format, setFormat] = useState<string>(initialFormat);
  const [headline, setHeadline] = useState(() => applyTemplateHeadline(initialFormat));
  const [state, setState] = useState<string>('scripting');

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    setHeadline(applyTemplateHeadline(newFormat));
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!headline.trim()) {
      setError('Headline is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ format, headline: headline.trim(), state });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create piece');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell variant="form" onRequestClose={onClose}>
      <div className="modal-header">
          <h2 className="modal-title">New piece</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ fontSize: 14, color: 'var(--medium-gray)' }}>
              Create a piece not linked to any story. You can link it to a story later from the piece or story page.
            </p>
            <div>
              <label className="form-label">Format</label>
              <select
                value={format}
                onChange={(e) => handleFormatChange(e.target.value)}
                className="form-input"
              >
                {FORMAT_OPTIONS().map((f) => (
                  <option key={f} value={f}>
                    {getPieceTypeDisplayLabel(f)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="form-input"
                placeholder="e.g. Housing crisis – Reels cut"
                maxLength={500}
              />
            </div>
            <div>
              <label className="form-label">Stage</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="form-input"
              >
                {BOARD_PIECE_STATES.map((s) => (
                  <option key={s} value={s}>
                    {BOARD_PIECE_STATE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500 }}>{error}</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !headline.trim()} className="btn btn-primary">
              {submitting ? 'Creating…' : 'Create piece'}
            </button>
          </div>
        </form>
    </ModalShell>
  );
}
