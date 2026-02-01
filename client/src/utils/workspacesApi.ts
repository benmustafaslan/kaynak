import { api } from './api';
import type { Workspace } from '../types/workspace';

export interface WorkspaceMemberItem {
  _id: string;
  userId: string;
  name?: string;
  email?: string;
  role: string;
  joinedAt: string;
}

export const workspacesApi = {
  listMine: () =>
    api.get<{ workspaces: Workspace[] }>('/workspaces').then((r) => r.workspaces),

  getBySlug: (slug: string) =>
    api.get<{ workspace: Workspace }>(`/workspaces/by-slug/${encodeURIComponent(slug)}`).then((r) => r.workspace),

  getById: (id: string) =>
    api.get<{ workspace: Workspace }>(`/workspaces/${id}`).then((r) => r.workspace),

  create: (name: string) =>
    api.post<{ workspace: Workspace }>('/workspaces', { name }).then((r) => r.workspace),

  listMembers: (workspaceId: string) =>
    api.get<{ members: WorkspaceMemberItem[] }>(`/workspaces/${workspaceId}/members`).then((r) => r.members),

  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    api.patch<{ member: { userId: string; role: string } }>(`/workspaces/${workspaceId}/members/${encodeURIComponent(userId)}`, { role }).then((r) => r.member),

  getInvite: (workspaceId: string) =>
    api.get<{ inviteLink: string; token: string; expiresAt: string; role: string }>(`/workspaces/${workspaceId}/invite`).then((r) => r),

  createInvite: (workspaceId: string, role?: string) =>
    api.post<{ inviteLink: string; token: string; expiresAt: string }>(`/workspaces/${workspaceId}/invites`, { role }).then((r) => r),

  deleteWorkspace: (workspaceId: string) =>
    api.delete<{ deleted: true }>(`/workspaces/${workspaceId}`).then((r) => r),
};

export interface AcceptInviteResponse {
  workspace: { _id: string; name: string; slug: string; role: string };
  alreadyMember?: boolean;
}

export const invitesApi = {
  accept: (token: string) =>
    api.post<AcceptInviteResponse>('/invites/accept', { token }),
};
