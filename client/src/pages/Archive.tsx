import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Story } from '../types/story';
import type { Piece } from '../types/piece';
import { storiesApi } from '../utils/storiesApi';
import { piecesApi } from '../utils/piecesApi';

export default function Archive() {
  const [rejectedStories, setRejectedStories] = useState<Story[]>([]);
  const [rejectedPieces, setRejectedPieces] = useState<Piece[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingPieces, setLoadingPieces] = useState(true);

  const fetchRejectedStories = useCallback(async () => {
    setLoadingStories(true);
    try {
      const res = await storiesApi.list({ rejected: true, limit: 100, sort: 'updatedAtDesc' });
      setRejectedStories(res.stories);
    } catch {
      setRejectedStories([]);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  const fetchRejectedPieces = useCallback(async () => {
    setLoadingPieces(true);
    try {
      const res = await piecesApi.listAll({ rejected: true });
      setRejectedPieces(res.pieces);
    } catch {
      setRejectedPieces([]);
    } finally {
      setLoadingPieces(false);
    }
  }, []);

  useEffect(() => {
    fetchRejectedStories();
  }, [fetchRejectedStories]);

  useEffect(() => {
    fetchRejectedPieces();
  }, [fetchRejectedPieces]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Archive</h1>
        <p className="page-subtitle">
          Rejected ideas and archived content. Revisit past decisions here.
        </p>
      </header>

      <div className="archive-page">
        <section className="archive-section series-page-section" aria-labelledby="rejected-ideas-heading">
          <h2 id="rejected-ideas-heading" className="series-page-section-title">
            Rejected Ideas
          </h2>
          <p className="archive-section-desc">Rejected story and series ideas from Agenda Tracking.</p>
          {loadingStories ? (
            <div className="series-page-loading" aria-busy="true">
              Loading…
            </div>
          ) : rejectedStories.length === 0 ? (
            <div className="series-page-empty">
              <p className="series-page-empty-text">
                No rejected story or series ideas yet.
              </p>
            </div>
          ) : (
            <ul className="stories-list">
              {rejectedStories.map((s) => (
                <li key={s._id} className="stories-list-item">
                  <Link
                    to={`/story/${s._id}`}
                    state={{ from: '/archive' }}
                    className="stories-list-link"
                  >
                    <span className="stories-list-headline">{s.headline}</span>
                    {s.kind === 'parent' ? (
                      <span className="stories-list-series">Series</span>
                    ) : null}
                    {s.rejectionReason ? (
                      <span className="stories-list-meta" title={s.rejectionReason}>
                        {s.rejectionReason}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="archive-section series-page-section" aria-labelledby="rejected-pieces-heading">
          <h2 id="rejected-pieces-heading" className="series-page-section-title">
            Rejected Piece Ideas
          </h2>
          {loadingPieces ? (
            <div className="series-page-loading" aria-busy="true">
              Loading…
            </div>
          ) : rejectedPieces.length === 0 ? (
            <div className="series-page-empty">
              <p className="series-page-empty-text">
                No rejected piece ideas yet.
              </p>
            </div>
          ) : (
            <ul className="stories-list">
              {rejectedPieces.map((p) => (
                <li key={p._id} className="stories-list-item">
                  <Link
                    to={`/piece/${p._id}`}
                    state={{ from: '/archive' }}
                    className="stories-list-link"
                  >
                    <span className="stories-list-headline">{p.headline}</span>
                    {p.rejectionReason ? (
                      <span className="stories-list-meta" title={p.rejectionReason}>
                        {p.rejectionReason}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
