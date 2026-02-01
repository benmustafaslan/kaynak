import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Story } from '../../types/story';

export interface SeriesSearchBarProps {
  /** All series (parents) to choose from, or result of search */
  series: Story[];
  /** Currently selected series id, or empty for None / All series */
  value: string;
  onChange: (seriesId: string) => void;
  id?: string;
  disabled?: boolean;
  /** Placeholder when no selection (e.g. "Search series…", "Filter by series…") */
  placeholder?: string;
  'aria-label'?: string;
  /** When true, show "All series" as the clear option (e.g. Stories page filter) */
  filterMode?: boolean;
  /** Optional: fetch series by search query for server-side search. If provided, series prop is ignored for results and used only as initial/fallback. */
  onSearch?: (query: string) => Promise<Story[]>;
}

const DEBOUNCE_MS = 200;

export function SeriesSearchBar({
  series: seriesProp,
  value,
  onChange,
  id,
  disabled,
  placeholder = 'Search series…',
  'aria-label': ariaLabel = 'Series',
  filterMode = false,
  onSearch,
}: SeriesSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Story[]>(seriesProp);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSelectedRef = useRef<Story | null>(null);

  const selectedSeries = useMemo(() => {
    const fromList = seriesProp.find((s) => s._id === value) ?? searchResults.find((s) => s._id === value);
    if (fromList) {
      lastSelectedRef.current = fromList;
      return fromList;
    }
    if (value && lastSelectedRef.current?._id === value) return lastSelectedRef.current;
    return undefined;
  }, [seriesProp, searchResults, value]);

  const listOptions = useMemo(() => {
    return onSearch ? searchResults : filterSeries(seriesProp, search);
  }, [onSearch, searchResults, seriesProp, search]);

  useEffect(() => {
    if (!onSearch) {
      setSearchResults(seriesProp);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (!q) {
      setSearchResults(seriesProp);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onSearch(q)
        .then((stories) => {
          setSearchResults(stories);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onSearch, search, seriesProp]);

  function filterSeries(list: Story[], q: string): Story[] {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s) => s.headline.toLowerCase().includes(term));
  }

  const displayValue = open ? search : (selectedSeries ? selectedSeries.headline : '');

  useEffect(() => {
    if (!open) return;
    setHighlightedIndex(-1);
  }, [search, listOptions.length, open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectValue = useCallback(
    (seriesId: string, series?: Story) => {
      if (series) lastSelectedRef.current = series;
      else if (!seriesId) lastSelectedRef.current = null;
      onChange(seriesId);
      setOpen(false);
      setSearch('');
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
          setSearch('');
        }
        if (e.key === 'Backspace' && value && !displayValue) {
          onChange('');
        }
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch(selectedSeries ? selectedSeries.headline : '');
        inputRef.current?.blur();
        e.preventDefault();
        return;
      }
      const clearOption = 1;
      const total = clearOption + listOptions.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => (i < total - 1 ? i + 1 : i));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => (i > -1 ? i - 1 : -1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex === -1) return;
        if (highlightedIndex === 0) {
          selectValue('');
          return;
        }
        const s = listOptions[highlightedIndex - 1];
        if (s) selectValue(s._id, s);
      }
    },
    [open, value, displayValue, selectedSeries, listOptions, highlightedIndex, selectValue, onChange]
  );

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  return (
    <div ref={containerRef} className="series-search-bar" style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        disabled={disabled}
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="form-input"
        style={{
          width: '100%',
          minWidth: 160,
          fontSize: 14,
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? 'series-search-bar-list' : undefined}
        aria-activedescendant={
          open && highlightedIndex >= 0 ? `series-search-bar-option-${highlightedIndex}` : undefined
        }
        role="combobox"
        autoComplete="off"
      />

      {open && (
        <div
          id="series-search-bar-list"
          ref={listRef}
          className="series-search-bar-dropdown"
          role="listbox"
          aria-label={ariaLabel}
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
            maxHeight: 280,
          }}
        >
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-sm text-app-text-secondary">
              {onSearch && search.trim() ? 'Search results' : 'Series'}
            </span>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', padding: 4 }}>
            {/* Clear / None / All series */}
            <button
              type="button"
              role="option"
              data-index={0}
              id="series-search-bar-option-0"
              aria-selected={!value}
              onClick={() => selectValue('')}
              onMouseEnter={() => setHighlightedIndex(0)}
              className="series-search-bar-option"
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                border: 'none',
                borderRadius: 6,
                background: !value ? 'var(--bg-elevated)' : highlightedIndex === 0 ? 'var(--bg-elevated)' : 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                color: 'inherit',
              }}
            >
              {filterMode ? 'All series' : 'None'}
            </button>
            {searching ? (
              <div style={{ padding: 12, fontSize: 14, color: 'var(--medium-gray)' }}>Searching…</div>
            ) : listOptions.length === 0 ? (
              <div style={{ padding: 12, fontSize: 14, color: 'var(--medium-gray)' }}>
                {search.trim() ? `No series match “${search.trim()}”` : 'No series yet.'}
              </div>
            ) : (
              listOptions.map((s, idx) => {
                const optionIndex = idx + 1;
                return (
                  <button
                    key={s._id}
                    type="button"
                    role="option"
                    data-index={optionIndex}
                    id={`series-search-bar-option-${optionIndex}`}
                    aria-selected={value === s._id}
                    onClick={() => selectValue(s._id, s)}
                    onMouseEnter={() => setHighlightedIndex(optionIndex)}
                    className="series-search-bar-option"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: 6,
                      background:
                        value === s._id
                          ? 'var(--bg-elevated)'
                          : highlightedIndex === optionIndex
                            ? 'var(--bg-elevated)'
                            : 'transparent',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'inherit',
                    }}
                  >
                    {s.headline}
                  </button>
                );
              })
            )}
          </div>
          {!onSearch && seriesProp.length > 0 && (
            <div
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--medium-gray)',
                borderTop: '1px solid var(--border)',
              }}
            >
              {listOptions.length} of {seriesProp.length} series
            </div>
          )}
        </div>
      )}
    </div>
  );
}
