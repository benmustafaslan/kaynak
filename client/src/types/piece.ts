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

/** Piece workflow states (each piece moves independently). */
export const PIECE_STATES = ['scripting', 'multimedia', 'finalization', 'published', 'archived'] as const;
export type PieceState = (typeof PIECE_STATES)[number];

export const PIECE_STATE_LABELS: Record<string, string> = {
  scripting: 'Scripting',
  multimedia: 'Production',
  finalization: 'Ready',
  published: 'Published',
  archived: 'Archived',
};

/** Story ref for display (populated linkedStoryIds item). Includes research for piece context. */
export type LinkedStoryRef = { _id: string; headline: string; researchNotes?: string };

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
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  /** Ideas inbox: reject, park, approve */
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  parkedUntil?: string | null;
  approved?: boolean;
  approvedBy?: string | { _id: string; name: string; email: string } | null;
  approvedAt?: string | null;
}

/** Piece states shown on the Board (no Research, no Archived in main columns). */
export const BOARD_PIECE_STATES = ['scripting', 'multimedia', 'finalization', 'published'] as const;
export type BoardPieceState = (typeof BOARD_PIECE_STATES)[number];

export const BOARD_PIECE_STATE_LABELS: Record<BoardPieceState, string> = {
  scripting: 'Scripting',
  multimedia: 'Production',
  finalization: 'Ready',
  published: 'Published',
};

/** Board column colors for piece states (match story workflow colors). */
export const PIECE_WORKFLOW_COLORS: Record<BoardPieceState, string> = {
  scripting: '#7c3aed',
  multimedia: '#ea580c',
  finalization: '#16a34a',
  published: '#6b7280',
};
