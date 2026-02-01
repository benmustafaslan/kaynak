import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { activityApi, type ActivityItemWithStory } from '../utils/activityApi';
import { piecesApi } from '../utils/piecesApi';
import type { Piece } from '../types/piece';
import { PIECE_STATE_LABELS } from '../types/piece';

const ACTIVITY_LIMIT = 20;
const MY_PIECES_LIMIT = 8;
const DEADLINES_DAYS = 7;

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function formatDeadlineDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDeadlineColor(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return 'var(--accent-danger)';
  if (diffDays <= 1) return 'var(--accent-warning)';
  return 'var(--accent-success)';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function DashboardCard({ title, children, className = '' }: DashboardCardProps) {
  return (
    <section
      className={`rounded-xl border p-4 ${className}`}
      style={{ background: 'var(--bg-gray)', borderColor: 'var(--border)' }}
      aria-labelledby={title.replace(/\s+/g, '-').toLowerCase()}
    >
      <h2
        id={title.replace(/\s+/g, '-').toLowerCase()}
        className="mb-3 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--app-text-secondary)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';
  const user = useAuthStore((s) => s.user);

  const [activity, setActivity] = useState<ActivityItemWithStory[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [myPieces, setMyPieces] = useState<Piece[]>([]);
  const [myPiecesLoading, setMyPiecesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    activityApi
      .getRecent(ACTIVITY_LIMIT)
      .then((res) => {
        if (!cancelled) setActivity(res.activity ?? []);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMyPiecesLoading(true);
    piecesApi
      .listAll({ myStories: true })
      .then((res) => {
        if (!cancelled) {
          setMyPieces(res.pieces ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setMyPieces([]);
      })
      .finally(() => {
        if (!cancelled) setMyPiecesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingDeadlines = (() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + DEADLINES_DAYS);
    return myPieces
      .filter((p): p is Piece & { deadline: string } => Boolean(p.deadline))
      .map((p) => ({ piece: p, date: p.deadline }))
      .filter(({ date }) => {
        const d = new Date(date);
        return d >= now && d <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8);
  })();

  const linkState = { from: `${basePath}/dashboard` };

  return (
    <>
      <header className="page-header">
        <h1 className="page-title" style={{ color: 'var(--app-text-primary)' }}>
          {getGreeting()}, {user?.name ?? user?.email ?? 'there'}.
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <div
        className="dashboard-grid mx-auto max-w-6xl px-6 pb-8"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}
      >
        {/* Quick stats */}
        <DashboardCard title="Quick stats" className="md:col-span-1">
          <ul className="space-y-2 text-sm">
            <li style={{ color: 'var(--app-text-primary)' }}>
              <span style={{ color: 'var(--app-text-secondary)' }}>Pieces assigned to you:</span>{' '}
              {myPiecesLoading ? '…' : myPieces.length}
            </li>
            <li style={{ color: 'var(--app-text-primary)' }}>
              <span style={{ color: 'var(--app-text-secondary)' }}>Fact-checks needing you:</span>{' '}
              — <span className="text-xs" style={{ color: 'var(--medium-gray)' }}>(API coming)</span>
            </li>
          </ul>
        </DashboardCard>

        {/* Recent activity – full width */}
        <DashboardCard title="Recent activity" className="col-span-full">
          {activityLoading ? (
            <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 8).map((item) => {
                const story = typeof item.storyId === 'object' ? item.storyId : null;
                const headline = story?.headline ?? 'Story';
                const storyId = typeof item.storyId === 'object' ? item.storyId?._id : item.storyId;
                return (
                  <li key={item._id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      to={storyId ? `${basePath}/story/${storyId}` : '#'}
                      state={linkState}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {headline}
                    </Link>
                    <span style={{ color: 'var(--app-text-secondary)' }}>
                      {item.userId?.name ?? 'Someone'} · {item.action}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--medium-gray)' }}>
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {!activityLoading && activity.length > 0 && (
            <Link
              to={`${basePath}/stories`}
              className="mt-3 inline-block text-sm font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              View all stories →
            </Link>
          )}
        </DashboardCard>

        {/* Pieces assigned to me */}
        <DashboardCard title="Pieces assigned to me" className="md:col-span-1">
          {myPiecesLoading ? (
            <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>Loading…</p>
          ) : myPieces.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>No pieces assigned to you.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {myPieces.slice(0, MY_PIECES_LIMIT).map((p) => (
                  <li key={p._id}>
                    <Link
                      to={`${basePath}/piece/${p._id}`}
                      state={linkState}
                      className="block rounded px-2 py-1.5 text-sm hover:bg-black/10"
                      style={{ color: 'var(--app-text-primary)' }}
                    >
                      <span className="font-medium">{p.headline}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--medium-gray)' }}>
                        {PIECE_STATE_LABELS[p.state] ?? p.state}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {myPieces.length > MY_PIECES_LIMIT && (
                <Link
                  to={`${basePath}/board`}
                  className="mt-3 inline-block text-sm font-medium"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  View all on board →
                </Link>
              )}
            </>
          )}
        </DashboardCard>

        {/* Fact-checks needing me – placeholder */}
        <DashboardCard title="Fact-checks needing me" className="md:col-span-1">
          <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>
            Pending fact-checks assigned to you will appear here. API for workspace-wide fact-checks is not yet available.
          </p>
        </DashboardCard>

        {/* Upcoming deadlines */}
        <DashboardCard title="Upcoming deadlines" className="md:col-span-1">
          {myPiecesLoading ? (
            <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>Loading…</p>
          ) : upcomingDeadlines.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--medium-gray)' }}>No deadlines in the next 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingDeadlines.slice(0, 6).map(({ piece, date }) => (
                <li key={piece._id}>
                  <Link
                    to={`${basePath}/piece/${piece._id}`}
                    state={linkState}
                    className="flex items-baseline justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/10"
                    style={{ color: 'var(--app-text-primary)' }}
                  >
                    <span className="min-w-0 truncate font-medium">{piece.headline}</span>
                    <span className="shrink-0 text-xs" style={{ color: getDeadlineColor(date) }}>
                      {formatDeadlineDate(date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Quick actions */}
        <DashboardCard title="Quick actions" className="md:col-span-1">
          <div className="flex flex-col gap-2">
            <Link
              to={`${basePath}/board`}
              className="rounded border px-3 py-2 text-center text-sm font-medium transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'var(--btn-primary-bg)' }}
            >
              Pieces board
            </Link>
            <Link
              to={`${basePath}/stories`}
              className="rounded border px-3 py-2 text-center text-sm font-medium transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'var(--btn-primary-bg)' }}
            >
              Stories
            </Link>
            <Link
              to={`${basePath}/ideas`}
              className="rounded border px-3 py-2 text-center text-sm font-medium transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'var(--btn-primary-bg)' }}
            >
              Agenda tracking
            </Link>
            <Link
              to={`${basePath}/archive`}
              className="rounded border px-3 py-2 text-center text-sm font-medium transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', background: 'var(--btn-primary-bg)' }}
            >
              Archive
            </Link>
          </div>
        </DashboardCard>
      </div>
    </>
  );
}
