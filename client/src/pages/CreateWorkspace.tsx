import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { workspacesApi } from '../utils/workspacesApi';
import type { Workspace } from '../types/workspace';

export default function CreateWorkspace() {
  const { createWorkspace, setCurrent } = useWorkspaceStore();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Workspace | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError('');
    try {
      const workspace = await createWorkspace(trimmed);
      setCurrent(workspace);
      setCreated(workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!created) return;
    setGeneratingInvite(true);
    try {
      const { inviteLink: link } = await workspacesApi.createInvite(created._id);
      setInviteLink(link);
    } catch {
      setError('Failed to generate invite link');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (created) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: 'var(--app-bg)' }}>
        <div className="w-full max-w-md">
          <h1 className="text-center text-xl font-bold" style={{ color: 'var(--black)', marginBottom: 8 }}>
            Workspace created
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--medium-gray)', marginBottom: 24 }}>
            <strong style={{ color: 'var(--app-text-primary)' }}>{created.name}</strong> is ready. Add members or go to your workspace.
          </p>

          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium" style={{ color: 'var(--app-text-primary)' }}>
              Add Members
            </h2>
            <p className="mb-3 text-sm" style={{ color: 'var(--medium-gray)' }}>
              Share this link so others can join your workspace.
            </p>
            {inviteLink ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="rounded border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--app-bg)' }}
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)' }}
                >
                  {copied ? 'Copied!' : 'Copy invite link'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)' }}
              >
                {generatingInvite ? 'Generating…' : 'Generate invite link'}
              </button>
            )}
          </section>

          <div className="flex flex-col gap-2">
            <Link
              to="/board"
              className="block rounded px-4 py-2 text-center text-sm font-medium text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              Go to workspace
            </Link>
            <Link
              to="/w"
              className="block rounded border px-4 py-2 text-center text-sm font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)' }}
            >
              Choose another workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md">
        <h1 className="text-center text-xl font-bold" style={{ color: 'var(--black)', marginBottom: 8 }}>
          Create a new workspace
        </h1>
        <p className="text-center text-sm" style={{ color: 'var(--medium-gray)', marginBottom: 24 }}>
          Enter a name for your workspace. You can invite people after it’s created.
        </p>

        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <label className="text-sm font-medium" style={{ color: 'var(--app-text-primary)' }}>
            Workspace name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Newsroom, Editorial"
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
            disabled={creating}
            autoFocus
          />
          {error && (
            <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--accent-primary)' }}
            >
              {creating ? 'Creating…' : 'Create workspace'}
            </button>
            <Link
              to="/w"
              className="rounded border px-4 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--app-text-primary)', lineHeight: '32px' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
