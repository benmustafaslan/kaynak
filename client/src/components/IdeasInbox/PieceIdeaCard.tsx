import type { Piece } from '../../types/piece';
import { getPieceTypeDisplayLabel } from '../../utils/pieceTypesPreferences';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface PieceIdeaCardProps {
  piece: Piece;
  onOpen: (piece: Piece) => void;
  onReject: (piece: Piece) => void;
  onPark: (piece: Piece) => void;
  onApprove: (piece: Piece) => void;
  canApprove: boolean;
}

export function PieceIdeaCard({ piece, onOpen, onReject, onPark, onApprove, canApprove }: PieceIdeaCardProps) {
  const createdByName = typeof piece.createdBy === 'object' && piece.createdBy?.name ? piece.createdBy.name : 'Unknown';

  return (
    <div className="idea-card">
      <h3 className="idea-card-headline">
        <button type="button" onClick={() => onOpen(piece)} className="idea-card-headline-link">
          {piece.headline}
        </button>
      </h3>
      <p className="idea-description idea-description--piece">
        Piece idea · {getPieceTypeDisplayLabel(piece.format)}
      </p>
      <div className="idea-meta">
        <span>Created by {createdByName}</span>
        <span>{formatDate(piece.createdAt)}</span>
      </div>
      {canApprove && (
        <div className="idea-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApprove(piece)}
          >
            ✓ Approve
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onPark(piece)}
          >
            ⏸ Park for Later
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onReject(piece)}
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );
}
