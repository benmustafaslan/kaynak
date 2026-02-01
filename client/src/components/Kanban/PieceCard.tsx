import { Link } from 'react-router-dom';
import type { Piece, LinkedStoryRef } from '../../types/piece';
import { getPieceTypeDisplayLabel } from '../../utils/pieceTypesPreferences';

function getLinkedStories(piece: Piece): LinkedStoryRef[] {
  const raw = piece.linkedStoryIds ?? [];
  return raw.filter(
    (s): s is LinkedStoryRef => typeof s === 'object' && s !== null && '_id' in s && 'headline' in s
  );
}

function getFirstLinkedStoryHeadline(piece: Piece): string | null {
  const linked = getLinkedStories(piece);
  return linked[0]?.headline ?? null;
}

function getLinkedStoriesLabel(piece: Piece): string {
  const linked = getLinkedStories(piece);
  const ids = piece.linkedStoryIds ?? [];
  const count = typeof ids[0] === 'string' ? ids.length : linked.length;
  if (count === 0) return 'No linked stories';
  if (count === 1) return linked[0]?.headline ?? '1 story';
  return `${count} linked stories`;
}

interface PieceCardProps {
  piece: Piece;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, piece: Piece) => void;
  variant?: 'card' | 'row';
}

export function PieceCard({ piece, isDragging, onDragStart, variant: _variant = 'row' }: PieceCardProps) {
  const firstHeadline = getFirstLinkedStoryHeadline(piece);
  const stateLower = (piece.state || 'scripting').toLowerCase();

  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart?.(e, piece);
        e.dataTransfer.setData('text/plain', piece._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      data-state={stateLower}
      className={`story-card story-card-row ${isDragging ? 'dragging cursor-grabbing' : 'cursor-grab'}`}
    >
      <Link
        to={`/piece/${piece._id}`}
        state={{ from: '/board' }}
        className="story-card-row-inner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="story-card-row-title-group">
          <span className="story-card-row-headline" title={piece.headline}>
            {piece.headline}
          </span>
          {(firstHeadline || (piece.linkedStoryIds?.length ?? 0) > 0) && (
            <span className="story-card-row-parent" title={getLinkedStoriesLabel(piece)}>
              {firstHeadline ?? getLinkedStoriesLabel(piece)}
            </span>
          )}
        </div>
        <span className="piece-card-format" title={piece.format}>
          {getPieceTypeDisplayLabel(piece.format)}
        </span>
      </Link>
    </div>
  );
}
