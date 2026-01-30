import { useState } from 'react';

interface ParkModalProps {
  ideaHeadline: string;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export function ParkModal({ ideaHeadline, onClose, onConfirm }: ParkModalProps) {
  const [dateStr, setDateStr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const date = dateStr ? new Date(dateStr) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      onConfirm(date);
      onClose();
    }
  };

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Park for Later</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ fontSize: 14, color: 'var(--medium-gray)' }}>
              Hide &quot;{ideaHeadline}&quot; until a date. It will reappear in Agenda Tracking after that.
            </p>
            <div>
              <label className="form-label">Show again after</label>
              <input
                type="date"
                value={dateStr || defaultDate.toISOString().slice(0, 10)}
                onChange={(e) => setDateStr(e.target.value)}
                min={minDate}
                className="form-input"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-secondary">
              Park
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
