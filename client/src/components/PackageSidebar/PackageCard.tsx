import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Story, StoryState } from '../../types/story';
import { STATE_CONFIG, getStateDisplayLabel, normalizeStateKey } from '../../types/story';
import { storiesApi } from '../../utils/storiesApi';

const PACKAGE_ACCENT = '#6366f1';

interface PackageCardProps {
  pkg: Story;
  onUpdated: (updated: Story) => void;
  onDeleted: () => void;
  onStoryAdded: () => void;
}

export function PackageCard({ pkg, onUpdated, onDeleted, onStoryAdded }: PackageCardProps) {
  const [mode, setMode] = useState<'display' | 'edit' | 'expanded'>('display');
  const [editHeadline, setEditHeadline] = useState(pkg.headline);
  const [editDescription, setEditDescription] = useState(pkg.description ?? '');
  const [saving, setSaving] = useState(false);
  const [children, setChildren] = useState<Story[] | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [showAddStory, setShowAddStory] = useState(false);
  const [addStoryList, setAddStoryList] = useState<Story[]>([]);
  const [addingStoryId, setAddingStoryId] = useState<string | null>(null);

  const childCount = pkg.childOrder?.length ?? 0;

  const loadChildren = useCallback(async () => {
    setLoadingChildren(true);
    try {
      const res = await storiesApi.getRelated(pkg._id);
      setChildren(res.relatedStories);
    } catch {
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }, [pkg._id]);

  const handleHeadlineClick = () => {
    if (mode === 'display') {
      setMode('expanded');
      loadChildren();
    } else if (mode === 'expanded') {
      setMode('display');
      setChildren(null);
    }
  };

  const handleEdit = () => {
    setEditHeadline(pkg.headline);
    setEditDescription(pkg.description ?? '');
    setMode('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await storiesApi.update(pkg._id, {
        headline: editHeadline.trim(),
        description: editDescription.trim() || undefined,
      });
      onUpdated(updated);
      setMode('display');
    } catch {
      // keep in edit mode; could show toast
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditHeadline(pkg.headline);
    setEditDescription(pkg.description ?? '');
    setMode('display');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete series "${pkg.headline}"? Child stories will be unlinked.`)) return;
    try {
      await storiesApi.delete(pkg._id);
      onDeleted();
    } catch {
      // could show toast
    }
  };

  const openAddStory = async () => {
    setShowAddStory(true);
    try {
      const res = await storiesApi.list({ limit: 100 });
      const withoutParent = res.stories.filter(
        (s) => s.kind !== 'parent' && !s.parentStoryId
      );
      const alreadyIn = new Set((children ?? []).map((c) => c._id));
      setAddStoryList(withoutParent.filter((s) => !alreadyIn.has(s._id)));
    } catch {
      setAddStoryList([]);
    }
  };

  const addStoryToPackage = async (storyId: string) => {
    setAddingStoryId(storyId);
    try {
      await storiesApi.update(storyId, { parentStoryId: pkg._id });
      onStoryAdded();
      setAddStoryList((prev) => prev.filter((s) => s._id !== storyId));
      await loadChildren();
    } catch {
      // could show toast
    } finally {
      setAddingStoryId(null);
    }
  };

  if (mode === 'edit') {
    return (
      <div className="package-card package-card-edit" style={{ borderLeftColor: PACKAGE_ACCENT }}>
        <label className="package-sidebar-form-label">
          Series name
          <input
            type="text"
            value={editHeadline}
            onChange={(e) => setEditHeadline(e.target.value)}
            className="package-sidebar-form-input"
            maxLength={500}
          />
        </label>
        <label className="package-sidebar-form-label">
          Description
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="package-sidebar-form-textarea"
            rows={2}
            maxLength={500}
          />
        </label>
        <div className="package-sidebar-form-actions">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="package-sidebar-btn package-sidebar-btn-ghost"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="package-sidebar-btn package-sidebar-btn-primary"
            disabled={saving || !editHeadline.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`package-card ${mode === 'expanded' ? 'package-card-expanded' : ''}`}
      style={{ borderLeftColor: PACKAGE_ACCENT }}
    >
      <div className="package-card-header">
        <button
          type="button"
          onClick={handleHeadlineClick}
          className="package-card-headline-btn"
          aria-expanded={mode === 'expanded'}
          aria-label={mode === 'expanded' ? 'Collapse package' : 'Expand to see child stories'}
        >
          <span className="package-card-icon" aria-hidden>📦</span>
          <span className="package-card-headline">{pkg.headline}</span>
        </button>
        <div className="package-card-badges">
          <span className="package-card-count" style={{ backgroundColor: `${PACKAGE_ACCENT}20`, color: PACKAGE_ACCENT }}>
            {childCount} {childCount === 1 ? 'story' : 'stories'}
          </span>
        </div>
        <div className="package-card-actions">
          <button
            type="button"
            onClick={handleEdit}
            className="package-card-action"
            aria-label="Edit series"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="package-card-action package-card-action-delete"
            aria-label="Delete series"
          >
            ×
          </button>
        </div>
      </div>

      {mode === 'expanded' && (
        <div className="package-card-children" role="region" aria-label="Child stories">
          {loadingChildren ? (
            <p className="package-card-children-loading">Loading…</p>
          ) : children && children.length > 0 ? (
            <ul className="package-card-children-list">
              {children.map((s) => (
                <li key={s._id} className="package-card-child">
                  <Link to={`/story/${s._id}`} state={{ from: location.pathname }} className="package-card-child-link">
                    <span className="package-card-child-bullet">•</span>
                    <span className="package-card-child-headline">{s.headline}</span>
                    <span
                      className="package-card-child-state"
                      style={{
                        backgroundColor: `${(STATE_CONFIG as Record<string, { color: string }>)[normalizeStateKey(s.state) || (s.state as string)?.toLowerCase?.() || '']?.color ?? '#888'}20`,
                        color: (STATE_CONFIG as Record<string, { color: string }>)[normalizeStateKey(s.state) || (s.state as string)?.toLowerCase?.() || '']?.color ?? '#666',
                      }}
                    >
                      {normalizeStateKey(s.state) === 'published' ? '✓ Published' : getStateDisplayLabel(s.state)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="package-card-children-empty">No stories in this package yet.</p>
          )}
          <button
            type="button"
            onClick={openAddStory}
            className="package-card-add-story"
          >
            + Add story to series
          </button>

          {showAddStory && (
            <>
              <div
                className="package-card-add-story-backdrop"
                onClick={() => setShowAddStory(false)}
                aria-hidden
              />
              <div className="package-card-add-story-modal" role="dialog" aria-label="Add story to series">
                <h3 className="package-card-add-story-title">Add story to series</h3>
                {addStoryList.length === 0 ? (
                  <p className="package-card-add-story-empty">No stories available to add (all are already in a series or are series).</p>
                ) : (
                  <ul className="package-card-add-story-list">
                    {addStoryList.map((s) => (
                      <li key={s._id}>
                        <button
                          type="button"
                          onClick={() => addStoryToPackage(s._id)}
                          className="package-card-add-story-item"
                          disabled={addingStoryId === s._id}
                        >
                          {s.headline}
                          {addingStoryId === s._id ? ' …' : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddStory(false)}
                  className="package-sidebar-btn package-sidebar-btn-ghost"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
