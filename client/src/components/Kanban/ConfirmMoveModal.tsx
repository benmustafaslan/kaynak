import type { StoryState } from '../../types/story';
import { getStateDisplayLabel } from '../../types/story';

interface ConfirmMoveModalProps {
  headline: string;
  fromState: StoryState;
  toState: StoryState;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmMoveModal({ headline, fromState, toState, onConfirm, onCancel }: ConfirmMoveModalProps) {
  return (
    <div className="modal-overlay animate-fade-in" onClick={onCancel}>
      <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Move story?</h3>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--near-black)', fontSize: 16, lineHeight: 1.6 }}>
            Move <strong style={{ color: 'var(--black)' }}>"{headline}"</strong> from{' '}
            <strong style={{ color: 'var(--black)' }}>{getStateDisplayLabel(fromState)}</strong> to{' '}
            <strong style={{ color: 'var(--black)' }}>{getStateDisplayLabel(toState)}</strong>?
          </p>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--medium-gray)' }}>
            State changes require your confirmation.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-primary">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
