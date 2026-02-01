import { useCallback, useEffect, useState } from 'react';
import type { Story } from '../../types/story';
import { storiesApi } from '../../utils/storiesApi';
import { CreatePackageForm } from './CreatePackageForm';
import { PackageCard } from './PackageCard';

const SIDEBAR_COLLAPSED_KEY = 'package-sidebar-collapsed';
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 60;

export function PackageSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [packages, setPackages] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [, setCreating] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storiesApi.list({ kind: 'parent', limit: 100 });
      setPackages(res.stories);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const handleCreatePackage = useCallback(
    async (data: { headline: string; description: string }) => {
      setCreating(true);
      try {
        await storiesApi.create({
          headline: data.headline,
          description: data.description || 'Package',
          kind: 'parent',
        });
        setShowCreateForm(false);
        await fetchPackages();
      } finally {
        setCreating(false);
      }
    },
    [fetchPackages]
  );

  const handlePackageUpdated = useCallback((updated: Story) => {
    setPackages((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }, []);

  const handlePackageDeleted = useCallback(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleStoryAdded = useCallback(() => {
    fetchPackages();
  }, [fetchPackages]);

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <aside
      className="package-sidebar"
      style={{ width: `${width}px`, minWidth: `${width}px` }}
      aria-label="Story packages"
    >
      <div className="package-sidebar-inner">
        <div className="package-sidebar-header">
          {!collapsed && (
            <span className="package-sidebar-title">Packages</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="package-sidebar-toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {!collapsed && (
          <>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="package-sidebar-new-btn"
              aria-label="New package"
            >
              + New Package
            </button>

            {showCreateForm ? (
              <CreatePackageForm
                onCancel={() => setShowCreateForm(false)}
                onSubmit={handleCreatePackage}
              />
            ) : loading ? (
              <div className="package-sidebar-loading" aria-busy="true">
                Loading…
              </div>
            ) : packages.length === 0 ? (
              <div className="package-sidebar-empty">
                <span className="package-sidebar-empty-icon" aria-hidden>📦</span>
                <p className="package-sidebar-empty-text">
                  Create your first story package to organize related stories.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="package-sidebar-new-btn package-sidebar-new-btn-prominent"
                >
                  + New Package
                </button>
              </div>
            ) : (
              <div className="package-sidebar-list">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg._id}
                    pkg={pkg}
                    onUpdated={handlePackageUpdated}
                    onDeleted={handlePackageDeleted}
                    onStoryAdded={handleStoryAdded}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="package-sidebar-collapsed-new"
            aria-label="New package (expand sidebar first)"
            title="New package"
          >
            +
          </button>
        )}
      </div>
    </aside>
  );
}
