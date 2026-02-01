export type WorkspaceMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  role?: WorkspaceMemberRole;
  createdAt: string;
}
