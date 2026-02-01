/**
 * Default piece workflow states. Used for validation and defaults until
 * per-workspace customizable workflows are implemented.
 *
 * Keys are stored on Piece.state and Piece.deadlines; labels are for display.
 * showOnBoard: true = column on Board/Kanban; false = e.g. Archived (sidebar only).
 */
const DEFAULT_PIECE_WORKFLOW = [
  { key: 'scripting', label: 'Scripting', showOnBoard: true },
  { key: 'multimedia', label: 'Production', showOnBoard: true },
  { key: 'finalization', label: 'Ready', showOnBoard: true },
  { key: 'published', label: 'Published', showOnBoard: true },
  { key: 'archived', label: 'Archived', showOnBoard: false },
];

const DEFAULT_PIECE_STATES = DEFAULT_PIECE_WORKFLOW.map((s) => s.key);
const DEFAULT_BOARD_PIECE_STATES = DEFAULT_PIECE_WORKFLOW.filter((s) => s.showOnBoard).map((s) => s.key);

export { DEFAULT_PIECE_WORKFLOW, DEFAULT_PIECE_STATES, DEFAULT_BOARD_PIECE_STATES };
