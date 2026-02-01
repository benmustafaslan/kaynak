import { useCallback, useRef } from 'react';
import PieceDetail, { type PieceDetailHandle } from '../pages/PieceDetail';
import { ModalShell } from './ModalShell';

interface PieceDetailModalProps {
  pieceId: string;
  onClose: () => void;
}

export function PieceDetailModal({ pieceId, onClose }: PieceDetailModalProps) {
  const pieceDetailRef = useRef<PieceDetailHandle | null>(null);

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

  return (
    <ModalShell
      variant="detail"
      maxWidth="1080px"
      zIndex={1100}
      onRequestClose={saveAndClose}
      aria-labelledby="piece-modal-title"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PieceDetail ref={pieceDetailRef} isModal pieceId={pieceId} onClose={handleClose} />
      </div>
    </ModalShell>
  );
}
