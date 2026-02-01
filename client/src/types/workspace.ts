export type WorkspaceMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** Per-workspace piece workflow state (for future customizable workflows). */
export interface PieceWorkflowStateOption {
  key: string;
  label: string;
  order: number;
  showOnBoard: boolean;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  role?: WorkspaceMemberRole;
  createdAt: string;
  /** When set, overrides default piece workflow for this workspace. */
  pieceWorkflowStates?: PieceWorkflowStateOption[] | null;
}
