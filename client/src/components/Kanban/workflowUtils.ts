import type { Story } from '../../types/story';

export function calculateAverageCycleTime(stories: Story[]): string {
  if (stories.length === 0) return '0d';

  const totalDays = stories.reduce((sum, story) => {
    const created = new Date(story.createdAt);
    const published = new Date(story.publishedAt ?? story.updatedAt);
    const days = Math.floor((published.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  const avg = Math.round((totalDays / stories.length) * 10) / 10;
  return `${avg}d`;
}

export function isPublishedThisMonth(story: Story): boolean {
  if (!story.publishedAt) return false;
  const now = new Date();
  const published = new Date(story.publishedAt);
  return (
    published.getMonth() === now.getMonth() &&
    published.getFullYear() === now.getFullYear()
  );
}
