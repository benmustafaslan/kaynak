/** Content format / piece type for deliverables (YouTube, Reels, etc.). */
export const CONTENT_FORMATS = ['youtube', 'instagram_reels', 'tiktok', 'article', 'other'] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

/** Display labels for predefined content formats (used in Preferences and dropdowns). */
export const CONTENT_FORMAT_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  article: 'Article',
  other: 'Other',
};

/**
 * Default piece workflow. Single source for state keys, labels, and colors.
 * Future: replace with workspace.pieceWorkflowStates when customizable per workspace.
 * "Idea" is not a stored state; pieces in Ideas Inbox are unapproved (pre-workflow).
 */
export const DEFAULT_PIECE_WORKFLOW = [
  { key: 'scripting', label: 'Scripting', color: '#7c3aed', showOnBoard: true },
  { key: 'multimedia', label: 'Production', color: '#ea580c', showOnBoard: true },
  { key: 'finalization', label: 'Ready', color: '#16a34a', showOnBoard: true },
  { key: 'published', label: 'Published', color: '#6b7280', showOnBoard: true },
  { key: 'archived', label: 'Archived', color: undefined, showOnBoard: false },
] as const;

export type DefaultPieceWorkflowEntry = (typeof DEFAULT_PIECE_WORKFLOW)[number];

/** All piece workflow state keys (default). */
export const PIECE_STATES = DEFAULT_PIECE_WORKFLOW.map((e) => e.key) as unknown as readonly [
  'scripting',
  'multimedia',
  'finalization',
  'published',
  'archived',
];
export type PieceState = (typeof PIECE_STATES)[number];

/** Labels for default workflow; future: use workspace config. */
export const PIECE_STATE_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_PIECE_WORKFLOW.map((e) => [e.key, e.label])
);

/** Story ref for display (populated linkedStoryIds item). Includes research for piece context. */
export type LinkedStoryRef = { _id: string; headline: string; researchNotes?: string };

export type UserRef = { _id: string; name: string; email: string };

export interface Piece {
  _id: string;
  /** Stories linked to this piece (many-to-many). */
  linkedStoryIds: string[] | LinkedStoryRef[];
  /** Story this piece was created from (optional). */
  createdFromStoryId?: string | null;
  /** Content format (predefined or custom from Preferences). */
  format: string;
  headline: string;
  state: string;
  currentScriptVersion: number;
  createdBy: UserRef;
  /** Producer, editors, and team (roles live on the piece). */
  producer?: string | UserRef | null;
  editors?: string[] | UserRef[];
  teamMembers?: { userId: string | UserRef; role: string }[];
  createdAt: string;
  updatedAt: string;
  /** Ideas inbox: reject, park, approve */
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  parkedUntil?: string | null;
  approved?: boolean;
  approvedBy?: string | { _id: string; name: string; email: string } | null;
  approvedAt?: string | null;
  /** Optional deadline (ISO date string). Legacy single deadline; prefer deadlines by state. */
  deadline?: string | null;
  /** Deadline per workflow state (e.g. Feb 1: Scripting, Feb 11: Production for same piece). */
  deadlines?: Partial<Record<BoardPieceState, string | null>>;
}

/** Piece states shown on the Board (default: Scripting, Production, Ready, Published). */
export const BOARD_PIECE_STATES = DEFAULT_PIECE_WORKFLOW.filter((e) => e.showOnBoard).map((e) => e.key) as unknown as readonly [
  'scripting',
  'multimedia',
  'finalization',
  'published',
];
export type BoardPieceState = (typeof BOARD_PIECE_STATES)[number];

export const BOARD_PIECE_STATE_LABELS: Record<BoardPieceState, string> = Object.fromEntries(
  DEFAULT_PIECE_WORKFLOW.filter((e) => e.showOnBoard).map((e) => [e.key, e.label])
) as Record<BoardPieceState, string>;

/** Board column colors for piece states (from default workflow). */
export const PIECE_WORKFLOW_COLORS: Record<BoardPieceState, string> = Object.fromEntries(
  DEFAULT_PIECE_WORKFLOW.filter((e) => e.showOnBoard && e.color).map((e) => [e.key, e.color!])
) as Record<BoardPieceState, string>;
