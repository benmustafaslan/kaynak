import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Story } from '../types/story';
import { storiesApi } from '../utils/storiesApi';
import { SeriesSearchBar } from '../components/Kanban/SeriesSearchBar';
import { NewStoryModal } from '../components/Kanban/NewStoryModal';

export default function Stories() {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);
  const [series, setSeries] = useState<Story[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [, setLoadingSeries] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storySearch, setStorySearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<string>('');
  const [showNewStory, setShowNewStory] = useState(false);
  const [showNewSeries, setShowNewSeries] = useState(false);

  const fetchSeries = useCallback(async () => {
    setLoadingSeries(true);
    try {
      const res = await storiesApi.list({ kind: 'parent', limit: 100 });
      setSeries(res.stories);
    } catch {
      setSeries([]);
    } finally {
      setLoadingSeries(false);
    }
  }, []);

  const fetchStories = useCallback(async () => {
    setLoadingStories(true);
    try {
      const res = await storiesApi.list({ approved: true, limit: 200 });
      // Dedupe by _id only (same doc returned twice); duplicate headlines = separate DB docs, show both
      const seen = new Set<string>();
      const uniq = res.stories.filter((s) => {
        const id = String(s._id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setStories(uniq);
    } catch {
      setStories([]);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Refetch when returning from Story Detail (modal close) so list shows saved changes
  useEffect(() => {
    const pathname = location.pathname;
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (pathname === '/stories' && prev?.startsWith('/story/')) {
      fetchStories();
    }
  }, [location.pathname, fetchStories]);

  const seriesHeadlineById = useMemo(() => {
    const map: Record<string, string> = {};
    series.forEach((p) => {
      map[p._id] = p.headline;
    });
    return map;
  }, [series]);

  const filteredStories = useMemo(() => {
    // Dedupe by _id only (duplicate headlines = separate docs, show both)
    const seen = new Set<string>();
    let list = stories.filter((s) => {
      const id = String(s._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const q = storySearch.trim().toLowerCase();
    if (seriesFilter) {
      list = list.filter((s) => {
        const pid = typeof s.parentStoryId === 'string' ? s.parentStoryId : s.parentStoryId?._id;
        return pid === seriesFilter;
      });
    }
    if (!q) return list;
    return list.filter(
      (s) =>
        s.headline.toLowerCase().includes(q) ||
        (s.parentStoryId && seriesHeadlineById[typeof s.parentStoryId === 'string' ? s.parentStoryId : s.parentStoryId._id]?.toLowerCase().includes(q))
    );
  }, [stories, storySearch, seriesFilter, seriesHeadlineById]);

  const handleNewStory = useCallback(
    async (data: { headline: string; description: string; categories: string[]; parentStoryId?: string }) => {
      await storiesApi.create({
        headline: data.headline,
        description: data.description,
        categories: data.categories,
        ...(data.parentStoryId ? { parentStoryId: data.parentStoryId } : {}),
      });
      setShowNewStory(false);
      await fetchStories();
    },
    [fetchStories]
  );

  const handleNewSeries = useCallback(
    async (data: { headline: string; description: string }) => {
      await storiesApi.create({
        headline: data.headline,
        description: data.description || 'Series',
        kind: 'parent',
      });
      setShowNewSeries(false);
      await fetchSeries();
      await fetchStories();
    },
    [fetchSeries, fetchStories]
  );

  return (
    <>
      <header className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Stories</h1>
          <p className="page-subtitle">
            Browse and manage stories. Filter by series to see stories in a series.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setShowNewStory(true)} className="btn btn-primary">
            + New Story
          </button>
          <button type="button" onClick={() => setShowNewSeries(true)} className="btn btn-primary">
            + New Series
          </button>
        </div>
      </header>

      <div className="stories-page">
        <div className="stories-page-filters">
          <label className="stories-search-label">
            <span className="sr-only">Search stories</span>
            <input
              type="search"
              value={storySearch}
              onChange={(e) => setStorySearch(e.target.value)}
              placeholder="Search by headline or series…"
              className="stories-search-input"
              aria-label="Search stories"
            />
          </label>
          <div className="stories-filter-series" style={{ minWidth: 200 }}>
            <SeriesSearchBar
              series={series}
              value={seriesFilter}
              onChange={setSeriesFilter}
              placeholder="Filter by series…"
              aria-label="Filter by series"
              filterMode
              onSearch={(q) => storiesApi.list({ kind: 'parent', search: q, limit: 50 }).then((r) => r.stories)}
            />
          </div>
        </div>

        {loadingStories ? (
          <div className="series-page-loading" aria-busy="true">
            Loading…
          </div>
        ) : stories.length === 0 ? (
          <div className="series-page-empty">
            <p className="series-page-empty-text">
              No stories in the workflow yet. Approve ideas from Agenda Tracking to add them here.
            </p>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="series-page-empty">
            <p className="series-page-empty-text">
              No stories match the current filters. Try changing search or filters.
            </p>
          </div>
        ) : (
          <ul className="stories-list">
            {filteredStories.map((s) => {
              const parentId = typeof s.parentStoryId === 'string' ? s.parentStoryId : s.parentStoryId?._id;
              const seriesHeadline = parentId ? seriesHeadlineById[parentId] : null;
              return (
                <li key={s._id} className="stories-list-item">
                  <Link
                    to={`/story/${s._id}`}
                    state={{ from: '/stories' }}
                    className="stories-list-link"
                  >
                    <span className="stories-list-headline">{s.headline}</span>
                    {seriesHeadline ? (
                      <span className="stories-list-series" title={`Series: ${seriesHeadline}`}>
                        {seriesHeadline}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showNewStory && (
        <NewStoryModal onClose={() => setShowNewStory(false)} onSubmit={handleNewStory} />
      )}
      {showNewSeries && (
        <NewStoryModal
          onClose={() => setShowNewSeries(false)}
          onSubmit={handleNewSeries}
          title="New Series"
          submitLabel="Create series"
          isPackage
        />
      )}
    </>
  );
}
