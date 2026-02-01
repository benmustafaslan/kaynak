import { Link, useLocation, useParams } from 'react-router-dom';
import type { Story, UserRef } from '../../types/story';

function getDisplayName(ref: string | UserRef | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'object' ? ref.name : undefined;
}

interface StoryCardProps {
  story: Story;
  currentUserId?: string;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, story: Story) => void;
  /** 'card' = full box per row; 'row' = single line, no box (smaller) */
  variant?: 'card' | 'row';
}

export function StoryCard({
  story,
  isDragging,
  onDragStart,
  variant = 'card',
}: StoryCardProps) {
  const location = useLocation();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const ownerName = getDisplayName(story.ownerId);
  const avatarPeople = ownerName ? [ownerName] : [];
  const uniqueNames = avatarPeople;
  const parentHeadline =
    story.parentStoryId && typeof story.parentStoryId === 'object' && story.parentStoryId.headline
      ? story.parentStoryId.headline
      : null;

  if (variant === 'row') {
    return (
      <div
        draggable
        onDragStart={(e) => {
          onDragStart?.(e, story);
          e.dataTransfer.setData('text/plain', story._id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={`story-card story-card-row ${isDragging ? 'dragging cursor-grabbing' : 'cursor-grab'}`}
      >
        <Link
          to={`${basePath}/story/${story._id}`}
          state={{ from: location.pathname }}
          className="story-card-row-inner"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="story-card-row-title-group">
            <span className="story-card-row-headline" title={story.headline}>
              {story.headline}
            </span>
            {parentHeadline && (
              <span className="story-card-row-parent" title={`Series: ${parentHeadline}`}>
                {parentHeadline}
              </span>
            )}
          </div>
          <div className="story-card-avatars">
            {uniqueNames.slice(0, 3).map((name, i) => (
              <div key={`${name}-${i}`} className="story-avatar story-avatar-row" title={name}>
                {name[0].toUpperCase()}
              </div>
            ))}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart?.(e, story);
        e.dataTransfer.setData('text/plain', story._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`story-card ${isDragging ? 'dragging cursor-grabbing' : 'cursor-grab'}`}
    >
      <Link to={`${basePath}/story/${story._id}`} state={{ from: location.pathname }} className="block" onClick={(e) => e.stopPropagation()}>
        {parentHeadline && (
          <div className="story-card-parent" title={`Series: ${parentHeadline}`}>
            {parentHeadline}
          </div>
        )}
        {(story.unverifiedFactChecks ?? 0) > 0 && (
          <div className="story-warning">
            {story.unverifiedFactChecks} fact-check{story.unverifiedFactChecks !== 1 ? 's' : ''} pending
          </div>
        )}
        <h4 className="story-card-title line-clamp-1">{story.headline}</h4>
        <div className="story-card-meta">
          <div className="story-card-avatars">
            {uniqueNames.slice(0, 3).map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="story-avatar"
                title={name}
              >
                {name[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}
