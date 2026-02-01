/**
 * Workflow states for stories (Kanban columns).
 * No automated transitions – user must confirm every state change.
 */
export const STORY_STATES = [
  'idea',
  'research',
  'scripting',
  'multimedia',
  'finalization',
  'published',
  'archived',
] as const;

export type StoryState = (typeof STORY_STATES)[number];

/** Board shows only workflow states (no Idea; Archived is in sidebar). */
export const BOARD_WORKFLOW_STATES: readonly StoryState[] = STORY_STATES.filter(
  (s) => s !== 'idea' && s !== 'archived'
);

/** Display labels for states (Title Case where user sees them). */
export const STATE_DISPLAY_LABELS: Record<StoryState, string> = {
  idea: 'Idea',
  research: 'Research',
  scripting: 'Scripting',
  multimedia: 'Multimedia',
  finalization: 'Finalization',
  published: 'Published',
  archived: 'Archived',
};

/** Kanban State Box labels: Production, Ready; Idea invisible. */
export const BOARD_STATE_DISPLAY_LABELS: Record<StoryState, string> = {
  ...STATE_DISPLAY_LABELS,
  multimedia: 'Production',
  finalization: 'Ready',
};

/** Icons and colors per workflow state for UI */
export const STATE_CONFIG: Record<
  StoryState,
  { icon: string; color: string }
> = {
  idea: { icon: '💡', color: '#A8A8A8' },
  research: { icon: '🔍', color: '#4A9EFF' },
  scripting: { icon: '📝', color: '#9B59B6' },
  multimedia: { icon: '🎬', color: '#F39C12' },
  finalization: { icon: '🎯', color: '#E67E22' },
  published: { icon: '✅', color: '#27AE60' },
  archived: { icon: '📦', color: '#95A5A6' },
};

/** Stepper/color bar and story card left border: Research=Blue, Scripting=Purple, Production=Orange, Ready=Green, Published=Gray */
export const WORKFLOW_STAGE_BAR_COLORS: Record<StoryState, string> = {
  idea: '#A8A8A8',
  research: '#2563eb',
  scripting: '#7c3aed',
  multimedia: '#ea580c',
  finalization: '#16a34a',
  published: '#6b7280',
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

export interface StoryDeadline {
  name: string;
  date: string; // ISO
  notifications?: { hours_24?: boolean; hours_1?: boolean };
  completed?: boolean;
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
  /** @deprecated Stories no longer have states; only pieces do. Kept for API compatibility. */
  state?: StoryState;
  workflowId?: string;

  producer?: string | UserRef;
  editors?: string[] | UserRef[];
  teamMembers?: { userId: string | UserRef; role: string }[];

  deadlines?: StoryDeadline[];
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
export interface StoryCardData extends Pick<Story, '_id' | 'headline' | 'producer' | 'editors' | 'categories'> {
  deadline?: string; // next or primary deadline ISO
  commentCount?: number;
}
