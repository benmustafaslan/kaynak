import { useCallback, useRef, useState } from 'react';
import PieceDetail, { type PieceDetailHandle } from '../pages/PieceDetail';
import { ModalShell } from './ModalShell';

interface PieceDetailModalProps {
  pieceId: string;
  onClose: () => void;
}

export function PieceDetailModal({ pieceId, onClose }: PieceDetailModalProps) {
  const pieceDetailRef = useRef<PieceDetailHandle | null>(null);
  const [saving, setSaving] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const saveAndClose = useCallback(() => {
    const p = pieceDetailRef.current?.saveAndClose?.();
    if (p && typeof p.then === 'function') {
      p.catch(() => {}).finally(() => {});
    } else {
      handleClose();
    }
  }, [handleClose]);

  const handleSave = useCallback(async () => {
    const saveFn = pieceDetailRef.current?.save;
    if (!saveFn) return;
    setSaving(true);
    try {
      await saveFn();
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <ModalShell
      variant="detail"
      maxWidth="1080px"
      zIndex={1100}
      onRequestClose={saveAndClose}
      aria-labelledby="piece-modal-title"
      headerActions={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-app-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PieceDetail ref={pieceDetailRef} isModal pieceId={pieceId} onClose={handleClose} />
      </div>
    </ModalShell>
  );
}
