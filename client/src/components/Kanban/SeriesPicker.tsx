import { useEffect, useMemo, useRef, useState } from 'react';
import type { Story } from '../../types/story';

interface SeriesPickerProps {
  /** All series (parents) to choose from */
  series: Story[];
  /** Currently selected series id, or empty for None */
  value: string;
  onChange: (seriesId: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

export function SeriesPicker({
  series,
  value,
  onChange,
  id,
  disabled,
  placeholder = 'None',
  'aria-label': ariaLabel = 'Series',
}: SeriesPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSeries = useMemo(() => series.find((s) => s._id === value), [series, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return series;
    return series.filter((s) => s.headline.toLowerCase().includes(q));
  }, [series, search]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const t = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (seriesId: string) => {
    onChange(seriesId);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <div ref={containerRef} className="series-picker" style={{ position: 'relative' }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="form-input series-picker-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: 'var(--bg-medium)',
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span className="series-picker-value" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedSeries ? selectedSeries.headline : placeholder}
        </span>
        <span aria-hidden style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {open && (
        <div
          className="series-picker-dropdown"
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            background: 'var(--bg-medium)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search series…"
              className="form-input"
              style={{ width: '100%', fontSize: 14 }}
              aria-label="Search series"
            />
          </div>
          <div
            ref={listRef}
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              padding: 4,
            }}
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect('')}
              className="series-picker-option"
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                border: 'none',
                borderRadius: 6,
                background: !value ? 'var(--light-gray)' : 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--black)',
              }}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, fontSize: 14, color: 'var(--medium-gray)' }}>
                No series match “{search}”
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  role="option"
                  aria-selected={value === s._id}
                  onClick={() => handleSelect(s._id)}
                  className="series-picker-option"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: 6,
                    background: value === s._id ? 'var(--light-gray)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: 'var(--black)',
                  }}
                >
                  {s.headline}
                </button>
              ))
            )}
          </div>
          {series.length > 0 && (
            <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--medium-gray)', borderTop: '1px solid var(--border)' }}>
              {filtered.length} of {series.length} series
            </div>
          )}
        </div>
      )}
    </div>
  );
}
