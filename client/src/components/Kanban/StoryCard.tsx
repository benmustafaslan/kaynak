import { Link, useLocation } from 'react-router-dom';
import type { Story, StoryState, UserRef } from '../../types/story';

function getDeadlineStatus(deadline?: string): 'overdue' | 'due-soon' | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  if (d < now) return 'overdue';
  const days = (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 3) return 'due-soon';
  return null;
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getDisplayName(ref: string | UserRef | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'object' ? ref.name : undefined;
}

interface StoryCardProps {
  story: Story;
  workflowStates: readonly StoryState[];
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
  const nextDeadline = story.deadlines?.find((d) => !d.completed);
  const deadlineStatus = nextDeadline ? getDeadlineStatus(nextDeadline.date) : null;
  const producerName = getDisplayName(story.producer);
  const editorNames = (story.editors ?? []).map((e) => getDisplayName(e));
  const avatarPeople = [producerName, ...editorNames].filter(
    (n): n is string => Boolean(n)
  );
  const uniqueNames = Array.from(new Set(avatarPeople));
  const parentHeadline =
    story.parentStoryId && typeof story.parentStoryId === 'object' && story.parentStoryId.headline
      ? story.parentStoryId.headline
      : null;

  const stateLower = story.state.toLowerCase();

  if (variant === 'row') {
    return (
      <div
        draggable
        onDragStart={(e) => {
          onDragStart?.(e, story);
          e.dataTransfer.setData('text/plain', story._id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        data-state={stateLower}
        className={`story-card story-card-row ${isDragging ? 'dragging cursor-grabbing' : 'cursor-grab'}`}
      >
        <Link
          to={`/story/${story._id}`}
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
          {nextDeadline && (
            <span
              className={`story-card-row-deadline ${
                deadlineStatus === 'overdue' ? 'overdue' : deadlineStatus === 'due-soon' ? 'due-soon' : ''
              }`}
            >
              {formatDeadline(nextDeadline.date)}
            </span>
          )}
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
      data-state={stateLower}
      className={`story-card ${isDragging ? 'dragging cursor-grabbing' : 'cursor-grab'}`}
    >
      <Link to={`/story/${story._id}`} state={{ from: location.pathname }} className="block" onClick={(e) => e.stopPropagation()}>
        {parentHeadline && (
          <div className="story-card-parent" title={`Part of series: ${parentHeadline}`}>
            {parentHeadline}
          </div>
        )}
        {(story.unverifiedFactChecks ?? 0) > 0 && story.state === 'FINALIZATION' && (
          <div className="story-warning">
            {story.unverifiedFactChecks} fact-check{story.unverifiedFactChecks !== 1 ? 's' : ''} pending
          </div>
        )}
        <h4 className="story-card-title line-clamp-1">{story.headline}</h4>
        <div className="story-card-meta">
          {nextDeadline && (
            <span
              className={`story-deadline ${
                deadlineStatus === 'overdue'
                  ? 'overdue'
                  : deadlineStatus === 'due-soon'
                    ? 'due-soon'
                    : ''
              }`}
            >
              {formatDeadline(nextDeadline.date)}
            </span>
          )}
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
