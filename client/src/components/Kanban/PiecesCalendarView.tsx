/**
 * Calendar view for Pieces by deadline (per-state deadlines).
 * Used on the Board (Pieces page) when view mode is "Calendar".
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Piece } from '../../types/piece';
import {
  BOARD_PIECE_STATE_LABELS,
  PIECE_WORKFLOW_COLORS,
  type BoardPieceState,
} from '../../types/piece';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_CELL_HEIGHT = 150;
const HEADLINE_MAX_LENGTH = 28;

function getCalendarGrid(month: Date): { date: Date | null; dayNum: number }[][] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const startWeekday = first.getDay();
  const daysInMonth = last.getDate();
  const rows: { date: Date | null; dayNum: number }[][] = [];
  let row: { date: Date | null; dayNum: number }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    row.push({ date: null, dayNum: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    row.push({ date: new Date(y, m, d), dayNum: d });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) {
    while (row.length < 7) row.push({ date: null, dayNum: 0 });
    rows.push(row);
  }
  return rows;
}

function getDateKey(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** One-line piece entry for calendar cells: state dot + truncated headline + state label. */
function CalendarPieceRow({
  piece,
  basePath,
  stateKey,
  fromPath,
}: {
  piece: Piece;
  basePath: string;
  stateKey: BoardPieceState;
  fromPath: string;
}) {
  const color = PIECE_WORKFLOW_COLORS[stateKey] ?? 'var(--app-text-tertiary)';
  const stateLabel = BOARD_PIECE_STATE_LABELS[stateKey];
  const headline =
    piece.headline.length > HEADLINE_MAX_LENGTH
      ? piece.headline.slice(0, HEADLINE_MAX_LENGTH - 1) + '…'
      : piece.headline;
  return (
    <Link
      to={`${basePath}/piece/${piece._id}`}
      state={{ from: fromPath }}
      className="calendar-piece-row"
      title={piece.headline + ` · ${stateLabel}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 0',
        fontSize: 12,
        color: 'var(--app-text)',
        textDecoration: 'none',
        borderRadius: 4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
        }}
        aria-hidden
      />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{headline}</span>
      <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--app-text-tertiary)' }}>
        · {stateLabel}
      </span>
    </Link>
  );
}

export type PiecesCalendarViewProps = {
  pieces: Piece[];
  basePath: string;
  /** Path to use as location.state.from when opening a piece (so closing the modal returns here, e.g. with ?view=calendar) */
  returnPath?: string;
};

export function PiecesCalendarView({ pieces, basePath, returnPath }: PiecesCalendarViewProps) {
  const fromState = returnPath ?? `${basePath}/board`;
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const grid = useMemo(() => getCalendarGrid(cursor), [cursor]);

  /** Per date: list of { piece, state } for that deadline (from deadlines by state, or legacy single deadline). */
  const entriesByDate = useMemo(() => {
    const map: Record<string, { piece: Piece; state: BoardPieceState }[]> = {};
    pieces.forEach((p) => {
      const deadlines = p.deadlines;
      if (deadlines) {
        (Object.entries(deadlines) as [BoardPieceState, string | null][]).forEach(([state, iso]) => {
          if (!iso) return;
          const key = getDateKey(new Date(iso));
          if (!map[key]) map[key] = [];
          map[key].push({ piece: p, state });
        });
      } else if (p.deadline) {
        const key = getDateKey(new Date(p.deadline));
        if (!map[key]) map[key] = [];
        map[key].push({
          piece: p,
          state: (p.state?.toLowerCase() || 'scripting') as BoardPieceState,
        });
      }
    });
    Object.keys(map).forEach((k) =>
      map[k].sort(
        (a, b) =>
          new Date(a.piece.deadlines?.[a.state] ?? a.piece.deadline ?? 0).getTime() -
          new Date(b.piece.deadlines?.[b.state] ?? b.piece.deadline ?? 0).getTime()
      )
    );
    return map;
  }, [pieces]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = getDateKey(new Date());

  return (
    <div className="pieces-calendar-view">
      <div
        className="pieces-calendar-nav"
        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}
      >
        <button
          type="button"
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          className="button button-secondary"
          style={{ padding: '8px 12px' }}
        >
          ← Previous
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{monthLabel}</h2>
        <button
          type="button"
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          className="button button-secondary"
          style={{ padding: '8px 12px' }}
        >
          Next →
        </button>
        <button
          type="button"
          onClick={() => {
            const n = new Date();
            setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
          }}
          className="button button-secondary"
          style={{ padding: '8px 12px', marginLeft: 8 }}
        >
          Today
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div
          className="pieces-calendar-grid"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            width: '100%',
            maxWidth: '100%',
            background: 'var(--app-bg)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              background: 'var(--app-bg-secondary)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                style={{
                  height: 32,
                  padding: '6px 10px',
                  minWidth: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--app-text-tertiary)',
                  borderRight: '1px solid var(--border)',
                  boxSizing: 'border-box',
                }}
              >
                {label}
              </div>
            ))}
          </div>
          {grid.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                height: DAY_CELL_HEIGHT,
                borderBottom: ri < grid.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {row.map((cell, ci) => {
                const key = cell.date ? getDateKey(cell.date) : '';
                const entries = (key && entriesByDate[key]) || [];
                const isToday = key === todayKey;
                return (
                  <div
                    key={ci}
                    style={{
                      height: DAY_CELL_HEIGHT,
                      borderRight: ci < 6 ? '1px solid var(--border)' : 'none',
                      padding: '10px',
                      background: isToday ? 'var(--app-bg-secondary)' : undefined,
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                        marginBottom: 8,
                        position: 'relative',
                        width: cell.date ? (isToday ? 32 : 24) : 0,
                        height: cell.date ? (isToday ? 32 : 20) : 0,
                      }}
                    >
                      {cell.date && (
                        <>
                          {isToday && (
                            <span
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                background: 'white',
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                              }}
                              aria-hidden
                            />
                          )}
                          <span
                            style={{
                              position: 'relative',
                              zIndex: 1,
                              fontSize: 13,
                              fontWeight: 600,
                              color: isToday
                                ? '#374151'
                                : cell.date
                                  ? 'var(--app-text)'
                                  : 'var(--app-text-tertiary)',
                              lineHeight: 1,
                            }}
                          >
                            {cell.dayNum}
                          </span>
                        </>
                      )}
                    </div>
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                      }}
                    >
                      {entries.map(({ piece, state }, i) => (
                        <li key={`${piece._id}-${state}-${i}`}>
                          <CalendarPieceRow piece={piece} basePath={basePath} stateKey={state} fromPath={fromState} />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
