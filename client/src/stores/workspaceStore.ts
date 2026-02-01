import { create } from 'zustand';
import { setWorkspaceId } from '../utils/api';
import { workspacesApi } from '../utils/workspacesApi';
import type { Workspace } from '../types/workspace';

interface WorkspaceState {
  workspaces: Workspace[];
  current: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setCurrentBySlug: (slug: string) => Promise<boolean>;
  setCurrent: (workspace: Workspace | null) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  current: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const workspaces = await workspacesApi.listMine();
      set({ workspaces, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: (e as Error).message,
        workspaces: [],
      });
    }
  },

  setCurrentBySlug: async (slug: string) => {
    set({ loading: true, error: null });
    try {
      const workspace = await workspacesApi.getBySlug(slug);
      set({ current: workspace, loading: false });
      setWorkspaceId(workspace._id);
      return true;
    } catch {
      set({ loading: false, current: null });
      setWorkspaceId(null);
      return false;
    }
  },

  setCurrent: (workspace: Workspace | null) => {
    set({ current: workspace });
    setWorkspaceId(workspace?._id ?? null);
  },

  createWorkspace: async (name: string) => {
    const workspace = await workspacesApi.create(name);
    set((s) => ({ workspaces: [...s.workspaces, workspace] }));
    return workspace;
  },

  deleteWorkspace: async (workspaceId: string) => {
    await workspacesApi.deleteWorkspace(workspaceId);
    const wasCurrent = get().current?._id === workspaceId;
    set((s) => ({
      workspaces: s.workspaces.filter((w) => w._id !== workspaceId),
      current: s.current?._id === workspaceId ? null : s.current,
    }));
    if (wasCurrent) setWorkspaceId(null);
  },

  clear: () => {
    set({ current: null, workspaces: [] });
    setWorkspaceId(null);
  },
}));
