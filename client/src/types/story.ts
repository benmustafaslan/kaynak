/**
 * Story lifecycle: Idea → Visible (on board) → Archived.
 * No automated transitions – user must confirm every state change.
 */
export const STORY_STATES = ['idea', 'visible', 'archived'] as const;

export type StoryState = (typeof STORY_STATES)[number];

/** Board shows only visible stories (Idea and Archived are not on the board). */
export const BOARD_WORKFLOW_STATES: readonly StoryState[] = ['visible'];

/** Display labels for states (Title Case where user sees them). */
export const STATE_DISPLAY_LABELS: Record<StoryState, string> = {
  idea: 'Idea',
  visible: 'Visible',
  archived: 'Archived',
};

/** Kanban / board state label (Visible is the only workflow state on board). */
export const BOARD_STATE_DISPLAY_LABELS: Record<StoryState, string> = {
  ...STATE_DISPLAY_LABELS,
};

/** Icons and colors per story state for UI */
export const STATE_CONFIG: Record<StoryState, { icon: string; color: string }> = {
  idea: { icon: '💡', color: '#A8A8A8' },
  visible: { icon: '📰', color: '#2563eb' },
  archived: { icon: '📦', color: '#95A5A6' },
};

/** Stepper/color bar and story card left border */
export const WORKFLOW_STAGE_BAR_COLORS: Record<StoryState, string> = {
  idea: '#A8A8A8',
  visible: '#2563eb',
  archived: '#9ca3af',
};

/** Normalize state (e.g. from API) to lowercase for lookup. */
export function normalizeStateKey(state: string | undefined): StoryState | '' {
  if (!state || typeof state !== 'string') return '';
  return state.toLowerCase() as StoryState;
}

/** Display label for state – always Title Case for user. Use when state may be uppercase from API. */
export function getStateDisplayLabel(state: string | undefined): string {
  const key = normalizeStateKey(state);
  return key ? STATE_DISPLAY_LABELS[key] ?? state ?? '' : '';
}

/** Board column label for state (Production, Ready, etc.). */
export function getBoardStateDisplayLabel(state: string | undefined): string {
  const key = normalizeStateKey(state);
  return key ? BOARD_STATE_DISPLAY_LABELS[key] ?? state ?? '' : '';
}

export interface StoryChecklistItem {
  text: string;
  completed: boolean;
  order: number;
}

export interface UserRef {
  _id: string;
  name: string;
  email: string;
}

export interface Story {
  _id: string;
  headline: string;
  description: string;
  state?: StoryState;
  workflowId?: string;

  /** Single owner: the person responsible for this story (idea). */
  ownerId?: string | UserRef | null;

  currentScriptVersion?: number;
  researchNotes?: string;

  categories?: string[];
  checklist?: StoryChecklistItem[];

  seriesId?: string;
  useSeriesResources?: boolean;

  /** Parent story (package) grouping. When populated (e.g. from list API), may be { _id, headline }. */
  kind?: 'story' | 'parent';
  parentStoryId?: string | { _id: string; headline: string };
  childOrder?: string[];

  createdBy: string | UserRef;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  deletedAt?: string;

  /** Ideas inbox */
  approved?: boolean;
  approvedBy?: string | UserRef;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  parkedUntil?: string;

  /** Workflow / blocking */
  stateChangedAt?: string;
  stateHistory?: { state: string; enteredAt: string; exitedAt?: string; durationDays?: number }[];
  isBlocked?: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  publishedAt?: string;
  cycleTimeDays?: number;

  /** For workflow alerts (e.g. from fact-checks API) */
  unverifiedFactChecks?: number;
}

/** For Kanban card display (can be extended with comment count from API later). */
export interface StoryCardData extends Pick<Story, '_id' | 'headline' | 'ownerId' | 'categories'> {
  commentCount?: number;
}
