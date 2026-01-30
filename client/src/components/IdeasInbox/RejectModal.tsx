import { useState } from 'react';

interface RejectModalProps {
  ideaHeadline: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectModal({ ideaHeadline, onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Reject Idea</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ fontSize: 14, color: 'var(--medium-gray)' }}>
              Reject &quot;{ideaHeadline}&quot;?
            </p>
            <div>
              <label className="form-label">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-input form-textarea"
                placeholder="e.g. Out of scope, duplicate, etc."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">
              Reject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
