import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Story } from '../types/story';
import type { Piece } from '../types/piece';
import { storiesApi } from '../utils/storiesApi';
import { piecesApi } from '../utils/piecesApi';

const ARCHIVE_LIMIT = 100;

interface ArchiveSectionProps<T> {
  id: string;
  title: string;
  description?: string;
  loading: boolean;
  items: T[];
  emptyMessage: string;
  renderItem: (item: T) => React.ReactNode;
}

function ArchiveSection<T extends { _id: string }>({
  id,
  title,
  description,
  loading,
  items,
  emptyMessage,
  renderItem,
}: ArchiveSectionProps<T>) {
  return (
    <section className="series-page-section" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="series-page-section-title">
        {title}
      </h2>
      {description && <p className="archive-section-desc">{description}</p>}
      {loading ? (
        <div className="series-page-loading" aria-busy="true">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="series-page-empty">
          <p className="series-page-empty-text">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="stories-list">
          {items.map((item) => (
            <li key={item._id} className="stories-list-item">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Archive() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const basePath = workspaceSlug ? `/w/${workspaceSlug}` : '';

  const [rejectedStories, setRejectedStories] = useState<Story[]>([]);
  const [rejectedPieces, setRejectedPieces] = useState<Piece[]>([]);
  const [archivedStories, setArchivedStories] = useState<Story[]>([]);
  const [archivedPieces, setArchivedPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState({ rejectedStories: true, rejectedPieces: true, archivedStories: true, archivedPieces: true });

  const fetchAll = useCallback(async () => {
    setLoading({ rejectedStories: true, rejectedPieces: true, archivedStories: true, archivedPieces: true });
    try {
      const [rejectedStoriesRes, rejectedPiecesRes, archivedStoriesRes, archivedPiecesRes] = await Promise.all([
        storiesApi.list({ rejected: true, limit: ARCHIVE_LIMIT, sort: 'updatedAtDesc' }),
        piecesApi.listAll({ rejected: true }),
        storiesApi.list({ state: 'archived', limit: ARCHIVE_LIMIT, sort: 'updatedAtDesc' }),
        piecesApi.listAll({ state: 'archived' }),
      ]);
      setRejectedStories(rejectedStoriesRes.stories);
      setRejectedPieces(rejectedPiecesRes.pieces);
      setArchivedStories(archivedStoriesRes.stories);
      setArchivedPieces(archivedPiecesRes.pieces);
    } catch {
      setRejectedStories([]);
      setRejectedPieces([]);
      setArchivedStories([]);
      setArchivedPieces([]);
    } finally {
      setLoading({ rejectedStories: false, rejectedPieces: false, archivedStories: false, archivedPieces: false });
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const linkState = { from: `${basePath}/archive` };

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Archive</h1>
        <p className="page-subtitle">
          Rejected ideas and archived content. Revisit past decisions here.
        </p>
      </header>

      <div className="stories-page">
        <ArchiveSection
          id="rejected-ideas"
          title="Rejected Ideas"
          description="Rejected story and series ideas from Agenda Tracking."
          loading={loading.rejectedStories}
          items={rejectedStories}
          emptyMessage="No rejected story or series ideas yet."
          renderItem={(s) => (
            <Link to={`${basePath}/story/${s._id}`} state={linkState} className="stories-list-link">
              <span className="stories-list-headline">{s.headline}</span>
              {s.kind === 'parent' && <span className="stories-list-series">Series</span>}
              {s.rejectionReason && (
                <span className="stories-list-meta" title={s.rejectionReason}>
                  {s.rejectionReason}
                </span>
              )}
            </Link>
          )}
        />
        <ArchiveSection
          id="rejected-pieces"
          title="Rejected Piece Ideas"
          description="Piece ideas rejected from Agenda Tracking."
          loading={loading.rejectedPieces}
          items={rejectedPieces}
          emptyMessage="No rejected piece ideas yet."
          renderItem={(p) => (
            <Link to={`${basePath}/piece/${p._id}`} state={linkState} className="stories-list-link">
              <span className="stories-list-headline">{p.headline}</span>
              {p.rejectionReason && (
                <span className="stories-list-meta" title={p.rejectionReason}>
                  {p.rejectionReason}
                </span>
              )}
            </Link>
          )}
        />
        <ArchiveSection
          id="archived-stories"
          title="Archived Stories"
          description="Stories moved to Archived. They no longer appear on the main Board."
          loading={loading.archivedStories}
          items={archivedStories}
          emptyMessage="No archived stories yet."
          renderItem={(s) => (
            <Link to={`${basePath}/story/${s._id}`} state={linkState} className="stories-list-link">
              <span className="stories-list-headline">{s.headline}</span>
              {s.kind === 'parent' && <span className="stories-list-series">Series</span>}
            </Link>
          )}
        />
        <ArchiveSection
          id="archived-pieces"
          title="Archived Pieces"
          description="Pieces moved to Archived. They no longer appear on the main Board."
          loading={loading.archivedPieces}
          items={archivedPieces}
          emptyMessage="No archived pieces yet."
          renderItem={(p) => (
            <Link to={`${basePath}/piece/${p._id}`} state={linkState} className="stories-list-link">
              <span className="stories-list-headline">{p.headline}</span>
            </Link>
          )}
        />
      </div>
    </>
  );
}
