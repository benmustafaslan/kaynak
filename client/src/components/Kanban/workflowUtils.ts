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

export function isOverdue(story: Story): boolean {
  if (!story.deadlines?.length) return false;
  const now = new Date();
  return story.deadlines.some(
    (d) => !d.completed && new Date(d.date).getTime() < now.getTime()
  );
}

export function isDueThisWeek(story: Story): boolean {
  if (!story.deadlines?.length) return false;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return story.deadlines.some((d) => {
    if (d.completed) return false;
    const dDate = new Date(d.date);
    return dDate.getTime() >= now.getTime() && dDate.getTime() <= weekFromNow.getTime();
  });
}

export function isPublishedThisMonth(story: Story): boolean {
  if (story.state !== 'published') return false;
  const now = new Date();
  const published = new Date(story.publishedAt ?? story.updatedAt);
  return (
    published.getMonth() === now.getMonth() &&
    published.getFullYear() === now.getFullYear()
  );
}
