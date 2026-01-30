import type { Story } from '../../types/story';
import type { UserRef } from '../../types/story';

function getDisplayName(ref: string | UserRef | undefined): string {
  if (!ref) return 'Unknown';
  return typeof ref === 'object' && ref?.name ? ref.name : 'Unknown';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface IdeaCardProps {
  idea: Story;
  onApprove: (idea: Story) => void;
  onApproveAsMine?: (idea: Story) => void;
  onReject: (idea: Story) => void;
  onPark: (idea: Story) => void;
  canApprove: boolean;
  isProducer?: boolean;
}

export function IdeaCard({ idea, onApprove, onApproveAsMine, onReject, onPark, canApprove, isProducer }: IdeaCardProps) {
  const createdByName = getDisplayName(idea.createdBy);

  return (
    <div className="idea-card">
      <h3 className="idea-card-headline">{idea.headline}</h3>
      <p className="idea-description">{idea.description}</p>

      <div className="idea-meta">
        <span>Submitted by {createdByName}</span>
        <span>{formatDate(idea.createdAt)}</span>
        {idea.categories && idea.categories.length > 0 && (
          <div className="idea-tags">
            {idea.categories.map((cat) => (
              <span key={cat} className="tag">
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {canApprove && (
        <div className="idea-actions">
          {isProducer && onApproveAsMine ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onApproveAsMine(idea)}
            >
              ✓ Approve as my story
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onApprove(idea)}
            >
              ✓ Approve & Start Research
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onPark(idea)}
          >
            ⏸ Park for Later
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onReject(idea)}
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );
}
