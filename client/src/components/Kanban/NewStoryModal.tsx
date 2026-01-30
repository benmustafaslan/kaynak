import { useState, useRef, useEffect } from 'react';
import { STATE_DISPLAY_LABELS, getStateDisplayLabel, type StoryState } from '../../types/story';
import type { Story } from '../../types/story';
import { storiesApi } from '../../utils/storiesApi';
import { SeriesPicker } from './SeriesPicker';

interface NewStoryModalProps {
  onClose: () => void;
  onSubmit: (data: { headline: string; description: string; categories: string[]; state?: StoryState; kind?: 'story' | 'parent'; parentStoryId?: string }) => Promise<void>;
  initialStoryState?: StoryState;
  /** Override modal title (e.g. "New Idea") */
  title?: string;
  /** Override submit button label (e.g. "Add idea") */
  submitLabel?: string;
  /** When true, show copy for adding an idea to Agenda Tracking */
  isIdea?: boolean;
  /** When true, create a story package (parent) – headline only, no script */
  isPackage?: boolean;
}

const MIN_DESCRIPTION = 3;

type StartOption = 'agenda' | 'research';

export function NewStoryModal({ onClose, onSubmit, initialStoryState, title: titleProp, submitLabel, isIdea, isPackage }: NewStoryModalProps) {
  const title = titleProp ?? (isPackage ? 'New story package' : 'New Story');
  const submitText = submitLabel ?? (isPackage ? 'Create package' : 'Create Story');
  const showStartChoice = initialStoryState == null && !isPackage;
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [startOption, setStartOption] = useState<StartOption>('research');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [seriesList, setSeriesList] = useState<Story[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPackage) {
      storiesApi.list({ kind: 'parent', limit: 100 }).then((res) => setSeriesList(res.stories)).catch(() => setSeriesList([]));
    } else {
      setSeriesList([]);
      setSelectedSeriesId('');
    }
  }, [isPackage]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const categories = categoriesText
    .split(/[,;]/)
    .map((c) => c.trim())
    .filter(Boolean);

  const effectiveState: StoryState | undefined = initialStoryState ?? (startOption === 'research' ? 'research' : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!headline.trim()) {
      setError('Headline is required.');
      return;
    }
    if (!isPackage && description.trim().length < MIN_DESCRIPTION) {
      setError(`Description must be at least ${MIN_DESCRIPTION} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        headline: headline.trim(),
        description: description.trim() || (isPackage ? 'Package' : ''),
        categories,
        ...(effectiveState && effectiveState !== 'idea' ? { state: effectiveState } : {}),
        ...(isPackage ? { kind: 'parent' as const } : {}),
        ...(!isPackage && selectedSeriesId ? { parentStoryId: selectedSeriesId } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={onClose}
    >
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {initialStoryState && !isPackage && (
              <p style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500 }}>
                Creating in: <strong>{getStateDisplayLabel(initialStoryState)}</strong>
              </p>
            )}
            {isPackage && (
              <p style={{ fontSize: 14, color: 'var(--medium-gray)' }}>
                A package groups related stories (e.g. Update, Educational, Commentary). It has no script; add child stories and link them here.
              </p>
            )}
            <div>
              <label className="form-label">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="form-input"
                placeholder="Story headline"
                maxLength={500}
              />
            </div>
            <div>
              <label className="form-label">Description{isPackage ? ' (optional)' : ''}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input form-textarea"
                placeholder={isPackage ? 'Optional short description for the package' : 'Brief description of the story'}
                rows={isPackage ? 2 : 4}
                maxLength={50000}
              />
            </div>
            <p style={{ fontSize: 13, color: 'var(--medium-gray)' }}>
              {initialStoryState
                ? `This story will be created directly in ${getStateDisplayLabel(initialStoryState)}.`
                : startOption === 'agenda'
                  ? (isIdea ? 'New ideas go to Agenda Tracking for review.' : 'Story will go to Agenda Tracking for Chief Editor review.')
                  : 'Story will be created in Research and appear on the board without approval.'}
            </p>
            {!isPackage && seriesList.length > 0 && (
              <div>
                <label className="form-label">Series (optional)</label>
                <SeriesPicker
                  series={seriesList}
                  value={selectedSeriesId}
                  onChange={setSelectedSeriesId}
                  placeholder="None"
                  aria-label="Series"
                />
              </div>
            )}
            <div>
              <label className="form-label">Categories (comma-separated)</label>
              <input
                type="text"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
                className="form-input"
                placeholder="e.g. Politics, Environment"
              />
            </div>
            {error && <p style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            {showStartChoice ? (
              <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    ...(submitting ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                >
                  {submitting ? 'Creating…' : startOption === 'research' ? 'Start in Research' : 'Submit to Agenda Tracking'}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  disabled={submitting}
                  className="btn btn-primary"
                  aria-label="Choose action"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  style={{
                    ...(submitting ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                    paddingLeft: 8,
                    paddingRight: 10,
                    borderLeft: '1px solid rgba(255,255,255,0.3)',
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  }}
                >
                  <span style={{ display: 'inline-block', transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </button>
                {menuOpen && (
                  <ul
                    role="menu"
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: '100%',
                      marginBottom: 4,
                      listStyle: 'none',
                      padding: 4,
                      minWidth: 220,
                      background: 'var(--white)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 10,
                    }}
                  >
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setStartOption('research'); setMenuOpen(false); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 12px',
                          textAlign: 'left',
                          border: 'none',
                          borderRadius: 4,
                          background: startOption === 'research' ? 'var(--light-gray)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        Start in Research
                      </button>
                    </li>
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setStartOption('agenda'); setMenuOpen(false); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 12px',
                          textAlign: 'left',
                          border: 'none',
                          borderRadius: 4,
                          background: startOption === 'agenda' ? 'var(--light-gray)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        Submit to Agenda Tracking
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={submitting ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                {submitting ? 'Creating…' : submitText}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
