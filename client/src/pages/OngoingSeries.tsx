import { useCallback, useEffect, useState } from 'react';
import type { Story } from '../types/story';
import { storiesApi } from '../utils/storiesApi';
import { CreatePackageForm } from '../components/PackageSidebar/CreatePackageForm';
import { PackageCard } from '../components/PackageSidebar/PackageCard';

export default function OngoingSeries() {
  const [series, setSeries] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storiesApi.list({ kind: 'parent', limit: 100 });
      setSeries(res.stories);
    } catch {
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleCreateSeries = useCallback(
    async (data: { headline: string; description: string }) => {
      setCreating(true);
      try {
        await storiesApi.create({
          headline: data.headline,
          description: data.description || 'Series',
          kind: 'parent',
        });
        setShowCreateForm(false);
        await fetchSeries();
      } finally {
        setCreating(false);
      }
    },
    [fetchSeries]
  );

  const handleSeriesUpdated = useCallback((updated: Story) => {
    setSeries((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }, []);

  const handleSeriesDeleted = useCallback(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleStoryAdded = useCallback(() => {
    fetchSeries();
  }, [fetchSeries]);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Ongoing Series</h1>
        <p className="page-subtitle">
          Groups of related stories (e.g. Update, Educational follow-up, Commentary). Create a series and link stories to it.
        </p>
      </header>

      <div className="series-page">
        <div className="series-page-actions">
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="series-page-new-btn"
            aria-label="New series"
          >
            + New Series
          </button>
        </div>

        {showCreateForm ? (
          <div className="series-page-form-wrap">
            <CreatePackageForm
              onCancel={() => setShowCreateForm(false)}
              onSubmit={handleCreateSeries}
            />
          </div>
        ) : loading ? (
          <div className="series-page-loading" aria-busy="true">
            Loading…
          </div>
        ) : series.length === 0 ? (
          <div className="series-page-empty">
            <span className="series-page-empty-icon" aria-hidden>📦</span>
            <p className="series-page-empty-text">
              Create your first series to organize related stories.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="series-page-new-btn series-page-new-btn-prominent"
            >
              + New Series
            </button>
          </div>
        ) : (
          <div className="series-page-list">
            {series.map((pkg) => (
              <PackageCard
                key={pkg._id}
                pkg={pkg}
                onUpdated={handleSeriesUpdated}
                onDeleted={handleSeriesDeleted}
                onStoryAdded={handleStoryAdded}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
