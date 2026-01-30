import { useCallback, useRef, useState } from 'react';

const ROLE_OPTIONS = ['Producer', 'Editor', 'Videographer', 'Reporter', 'Researcher'] as const;
const REMOVED_ROLE_TYPES_KEY = 'kaynak_removed_role_types';
const CUSTOM_ROLE_TYPES_KEY = 'kaynak_custom_role_types';

function loadRemovedRoleTypes(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_ROLE_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRemovedRoleTypes(list: string[]) {
  localStorage.setItem(REMOVED_ROLE_TYPES_KEY, JSON.stringify(list));
}

function loadCustomRoleTypes(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROLE_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomRoleTypes(list: string[]) {
  localStorage.setItem(CUSTOM_ROLE_TYPES_KEY, JSON.stringify(list));
}

function snapshot(removed: string[], custom: string[]) {
  return JSON.stringify({ removed, custom });
}

export default function Preferences() {
  const [removedRoleTypes, setRemovedRoleTypes] = useState<string[]>(loadRemovedRoleTypes);
  const [customRoleTypes, setCustomRoleTypes] = useState<string[]>(loadCustomRoleTypes);
  const [newRoleName, setNewRoleName] = useState('');
  const lastSavedRef = useRef(snapshot(removedRoleTypes, customRoleTypes));

  const predefinedSet = new Set(ROLE_OPTIONS);
  const allRoleTypes = [...ROLE_OPTIONS, ...customRoleTypes];
  const available = allRoleTypes.filter((r) => !removedRoleTypes.includes(r));
  const isDirty = snapshot(removedRoleTypes, customRoleTypes) !== lastSavedRef.current;

  const handleSave = useCallback(() => {
    saveRemovedRoleTypes(removedRoleTypes);
    saveCustomRoleTypes(customRoleTypes);
    lastSavedRef.current = snapshot(removedRoleTypes, customRoleTypes);
  }, [removedRoleTypes, customRoleTypes]);

  const handleDiscard = useCallback(() => {
    setRemovedRoleTypes(loadRemovedRoleTypes());
    setCustomRoleTypes(loadCustomRoleTypes());
    lastSavedRef.current = snapshot(loadRemovedRoleTypes(), loadCustomRoleTypes());
  }, []);

  const removeRoleType = useCallback((role: string) => {
    if (!window.confirm(`Hide "${role}" from the role dropdown? You can restore it from the Removed list.`)) {
      return;
    }
    setRemovedRoleTypes((prev) => (prev.includes(role) ? prev : [...prev, role]));
  }, []);

  const restoreRoleType = useCallback((role: string) => {
    setRemovedRoleTypes((prev) => prev.filter((r) => r !== role));
  }, []);

  const addNewRole = useCallback(() => {
    const name = newRoleName.trim();
    if (!name) return;
    if (predefinedSet.has(name as (typeof ROLE_OPTIONS)[number]) || customRoleTypes.includes(name)) {
      setNewRoleName('');
      return;
    }
    setCustomRoleTypes((prev) => [...prev, name].sort());
    setNewRoleName('');
  }, [newRoleName, customRoleTypes, predefinedSet]);

  const removeCustomRole = useCallback((role: string) => {
    if (
      !window.confirm(
        `Permanently delete "${role}"? It will be removed from the list. You can add it again later with Add New Role.`
      )
    ) {
      return;
    }
    setCustomRoleTypes((prev) => prev.filter((r) => r !== role));
    setRemovedRoleTypes((prev) => prev.filter((r) => r !== role));
  }, []);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Preferences</h1>
        <p className="page-subtitle">
          Board and workflow settings. Configure role types, defaults, and other options here.
        </p>
      </header>
      <div className="page-content-narrow page-content-preferences" style={{ maxWidth: 672 }}>
      <section className="mt-8 rounded-md border border-app-border-light bg-app-bg-secondary p-6">
        <h2 className="text-app-text-primary text-base font-semibold">Manage role types</h2>
        <p className="mt-1 text-app-text-tertiary text-sm">
          Add custom role types or remove built-in ones to control the role dropdown when assigning people on stories.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewRole()}
            placeholder="New role name"
            className="rounded border border-app-border-light bg-app-bg-primary px-2 py-1.5 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
            maxLength={100}
          />
          <button
            type="button"
            onClick={addNewRole}
            disabled={!newRoleName.trim()}
            className="rounded border border-app-border-light bg-app-bg-tertiary px-3 py-1.5 text-app-text-primary text-sm hover:bg-app-bg-hover disabled:opacity-50"
          >
            Add New Role
          </button>
        </div>
        <div className="mt-4">
          <span className="text-app-text-secondary text-sm font-medium">Available: </span>
          {available.length === 0 ? (
            <span className="text-app-text-tertiary text-sm">None</span>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {available.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1 text-app-text-primary text-sm"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => removeRoleType(r)}
                    className="rounded p-0.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-red"
                    aria-label={`Remove ${r}`}
                  >
                    ×
                  </button>
                  {customRoleTypes.includes(r) && (
                    <button
                      type="button"
                      onClick={() => removeCustomRole(r)}
                      className="rounded p-0.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-red"
                      aria-label={`Delete ${r} permanently`}
                      title="Delete this role type permanently"
                    >
                      ⌫
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {removedRoleTypes.length > 0 && (
          <div className="mt-4">
            <span className="text-app-text-secondary text-sm font-medium">Removed: </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {removedRoleTypes.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded border border-app-border-light bg-app-bg-primary px-2 py-1 text-app-text-tertiary text-sm"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => restoreRoleType(r)}
                    className="rounded p-0.5 underline decoration-app-border-medium decoration-1 underline-offset-1 hover:bg-app-bg-hover hover:text-app-blue hover:decoration-app-blue"
                    aria-label={`Restore ${r}`}
                  >
                    Restore
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-8 flex items-center gap-3 border-t border-app-border-light pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className="rounded border-0 bg-app-accent-primary px-4 py-2 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!isDirty}
          className="rounded border border-app-border-light bg-app-bg-tertiary px-4 py-2 text-app-text-primary text-sm hover:bg-app-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Discard
        </button>
        {isDirty && (
          <span className="text-app-text-tertiary text-sm">Unsaved changes. These affect all stories.</span>
        )}
      </div>
      </div>
    </>
  );
}
