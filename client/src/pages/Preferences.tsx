import { useCallback, useRef, useState } from 'react';
import {
  getPredefinedPieceTypes,
  getPieceTypeDisplayLabel,
  loadRemovedPieceTypes as loadRemovedPieceTypesStorage,
  loadCustomPieceTypes as loadCustomPieceTypesStorage,
  saveRemovedPieceTypes as saveRemovedPieceTypesStorage,
  saveCustomPieceTypes as saveCustomPieceTypesStorage,
} from '../utils/pieceTypesPreferences';

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

const PIECE_TYPE_OPTIONS = getPredefinedPieceTypes();

function loadRemovedPieceTypes(): string[] {
  return loadRemovedPieceTypesStorage();
}

function saveRemovedPieceTypes(list: string[]) {
  saveRemovedPieceTypesStorage(list);
}

function loadCustomPieceTypes(): string[] {
  return loadCustomPieceTypesStorage();
}

function saveCustomPieceTypes(list: string[]) {
  saveCustomPieceTypesStorage(list);
}

export default function Preferences() {
  const [pendingRemovedRoleTypes, setPendingRemovedRoleTypes] = useState<string[]>([]);
  const [customRoleTypes, setCustomRoleTypes] = useState<string[]>(loadCustomRoleTypes);
  const [newRoleName, setNewRoleName] = useState('');
  const [pendingRemovedPieceTypes, setPendingRemovedPieceTypes] = useState<string[]>([]);
  const [customPieceTypes, setCustomPieceTypes] = useState<string[]>(loadCustomPieceTypes);
  const [newPieceTypeName, setNewPieceTypeName] = useState('');
  const [, setSaveVersion] = useState(0);
  const lastSavedRef = useRef<string | null>(null);

  const savedRemovedRoleTypes = loadRemovedRoleTypes();
  const savedRemovedPieceTypes = loadRemovedPieceTypes();
  const effectiveRemovedRoleTypes = [...new Set([...savedRemovedRoleTypes, ...pendingRemovedRoleTypes])];
  const effectiveRemovedPieceTypes = [...new Set([...savedRemovedPieceTypes, ...pendingRemovedPieceTypes])];

  if (lastSavedRef.current === null) {
    lastSavedRef.current = JSON.stringify({
      roles: snapshot(effectiveRemovedRoleTypes, customRoleTypes),
      pieceTypes: snapshot(effectiveRemovedPieceTypes, customPieceTypes),
    });
  }

  const predefinedSet = new Set(ROLE_OPTIONS);
  const allRoleTypes = [...ROLE_OPTIONS, ...customRoleTypes];
  const availableRoles = allRoleTypes.filter((r) => !effectiveRemovedRoleTypes.includes(r));

  const predefinedPieceSet = new Set(PIECE_TYPE_OPTIONS);
  const allPieceTypes = [...PIECE_TYPE_OPTIONS, ...customPieceTypes];
  const availablePieceTypes = allPieceTypes.filter((t) => !effectiveRemovedPieceTypes.includes(t));

  const currentSnapshot = JSON.stringify({
    roles: snapshot(effectiveRemovedRoleTypes, customRoleTypes),
    pieceTypes: snapshot(effectiveRemovedPieceTypes, customPieceTypes),
  });
  const isDirty = currentSnapshot !== lastSavedRef.current;

  const handleSave = useCallback(() => {
    saveRemovedRoleTypes(effectiveRemovedRoleTypes);
    saveCustomRoleTypes(customRoleTypes);
    saveRemovedPieceTypes(effectiveRemovedPieceTypes);
    saveCustomPieceTypes(customPieceTypes);
    lastSavedRef.current = currentSnapshot;
    setPendingRemovedRoleTypes([]);
    setPendingRemovedPieceTypes([]);
    setSaveVersion((v) => v + 1);
  }, [effectiveRemovedRoleTypes, customRoleTypes, effectiveRemovedPieceTypes, customPieceTypes, currentSnapshot]);

  const handleDiscard = useCallback(() => {
    setPendingRemovedRoleTypes([]);
    setCustomRoleTypes(loadCustomRoleTypes());
    setPendingRemovedPieceTypes([]);
    setCustomPieceTypes(loadCustomPieceTypes());
    lastSavedRef.current = JSON.stringify({
      roles: snapshot(loadRemovedRoleTypes(), loadCustomRoleTypes()),
      pieceTypes: snapshot(loadRemovedPieceTypes(), loadCustomPieceTypes()),
    });
  }, []);

  const removeRoleType = useCallback((role: string) => {
    if (!window.confirm(`Hide "${role}" from the role dropdown? Save to apply.`)) {
      return;
    }
    setPendingRemovedRoleTypes((prev) => (prev.includes(role) ? prev : [...prev, role]));
  }, []);

  const restorePendingRoleType = useCallback((role: string) => {
    setPendingRemovedRoleTypes((prev) => prev.filter((r) => r !== role));
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
    saveRemovedRoleTypes(loadRemovedRoleTypes().filter((r) => r !== role));
    setPendingRemovedRoleTypes((prev) => prev.filter((r) => r !== role));
    setSaveVersion((v) => v + 1);
  }, []);

  const removePieceType = useCallback((type: string) => {
    if (!window.confirm(`Hide "${getPieceTypeDisplayLabel(type)}" from the piece type dropdown? Save to apply.`)) {
      return;
    }
    setPendingRemovedPieceTypes((prev) => (prev.includes(type) ? prev : [...prev, type]));
  }, []);

  const restorePendingPieceType = useCallback((type: string) => {
    setPendingRemovedPieceTypes((prev) => prev.filter((t) => t !== type));
  }, []);

  const addNewPieceType = useCallback(() => {
    const name = newPieceTypeName.trim();
    if (!name) return;
    if (predefinedPieceSet.has(name) || customPieceTypes.includes(name)) {
      setNewPieceTypeName('');
      return;
    }
    setCustomPieceTypes((prev) => [...prev, name].sort());
    setNewPieceTypeName('');
  }, [newPieceTypeName, customPieceTypes, predefinedPieceSet]);

  const removeCustomPieceType = useCallback((type: string) => {
    if (
      !window.confirm(
        `Permanently delete "${getPieceTypeDisplayLabel(type)}"? It will be removed from the list. You can add it again later with Add New Piece Type.`
      )
    ) {
      return;
    }
    setCustomPieceTypes((prev) => prev.filter((t) => t !== type));
    saveRemovedPieceTypes(loadRemovedPieceTypes().filter((t) => t !== type));
    setPendingRemovedPieceTypes((prev) => prev.filter((t) => t !== type));
    setSaveVersion((v) => v + 1);
  }, []);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Preferences</h1>
        <p className="page-subtitle">
          Board and workflow settings. Configure role types, piece types, and other options here.
        </p>
      </header>
      <div className="page-content-narrow page-content-preferences" style={{ maxWidth: 672 }}>
      <section className="mt-8 border-0 border-b border-app-border-light bg-transparent pb-6">
        <h2 className="text-app-text-primary text-base font-semibold">Manage role types</h2>
        <p className="mt-1 text-app-text-tertiary text-sm">
          Add custom role types or remove built-in ones to control the role dropdown when assigning people on stories.
        </p>
        <div className="mt-4">
          <span className="text-app-text-secondary text-sm font-medium">Available: </span>
          {availableRoles.length === 0 ? (
            <span className="text-app-text-tertiary text-sm">None</span>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {availableRoles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-none border-0 border-b border-app-border-light bg-transparent px-0 py-1 text-app-text-primary text-sm"
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
        {pendingRemovedRoleTypes.length > 0 && (
          <div className="mt-4">
            <span className="text-app-text-secondary text-sm font-medium">Removed (unsaved): </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingRemovedRoleTypes.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-none border-0 border-b border-app-border-light bg-transparent px-0 py-1 text-app-text-tertiary text-sm"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => restorePendingRoleType(r)}
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewRole()}
            placeholder="New role name"
            className="rounded border border-app-border-light bg-transparent px-2 py-1.5 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
            maxLength={100}
          />
          <button
            type="button"
            onClick={addNewRole}
            disabled={!newRoleName.trim()}
            className="rounded border border-app-border-light bg-app-bg-hover px-3 py-1.5 text-app-text-primary text-sm font-medium hover:bg-app-border-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add New Role
          </button>
        </div>
      </section>

      <section className="mt-8 border-0 border-b border-app-border-light bg-transparent pb-6">
        <h2 className="text-app-text-primary text-base font-semibold">Manage piece types</h2>
        <p className="mt-1 text-app-text-tertiary text-sm">
          Add custom piece types or remove built-in ones to control the format dropdown when creating content pieces (YouTube, Reels, etc.).
        </p>
        <div className="mt-4">
          <span className="text-app-text-secondary text-sm font-medium">Available: </span>
          {availablePieceTypes.length === 0 ? (
            <span className="text-app-text-tertiary text-sm">None</span>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {availablePieceTypes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-none border-0 border-b border-app-border-light bg-transparent px-0 py-1 text-app-text-primary text-sm"
                >
                  {getPieceTypeDisplayLabel(t)}
                  <button
                    type="button"
                    onClick={() => removePieceType(t)}
                    className="rounded p-0.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-red"
                    aria-label={`Remove ${getPieceTypeDisplayLabel(t)}`}
                  >
                    ×
                  </button>
                  {customPieceTypes.includes(t) && (
                    <button
                      type="button"
                      onClick={() => removeCustomPieceType(t)}
                      className="rounded p-0.5 text-app-text-tertiary hover:bg-app-bg-hover hover:text-app-red"
                      aria-label={`Delete ${getPieceTypeDisplayLabel(t)} permanently`}
                      title="Delete this piece type permanently"
                    >
                      ⌫
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {pendingRemovedPieceTypes.length > 0 && (
          <div className="mt-4">
            <span className="text-app-text-secondary text-sm font-medium">Removed (unsaved): </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingRemovedPieceTypes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-none border-0 border-b border-app-border-light bg-transparent px-0 py-1 text-app-text-tertiary text-sm"
                >
                  {getPieceTypeDisplayLabel(t)}
                  <button
                    type="button"
                    onClick={() => restorePendingPieceType(t)}
                    className="rounded p-0.5 underline decoration-app-border-medium decoration-1 underline-offset-1 hover:bg-app-bg-hover hover:text-app-blue hover:decoration-app-blue"
                    aria-label={`Restore ${getPieceTypeDisplayLabel(t)}`}
                  >
                    Restore
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newPieceTypeName}
            onChange={(e) => setNewPieceTypeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewPieceType()}
            placeholder="New piece type"
            className="rounded border border-app-border-light bg-transparent px-2 py-1.5 text-app-text-primary text-sm placeholder-app-text-tertiary focus:border-app-blue focus:outline-none"
            maxLength={64}
          />
          <button
            type="button"
            onClick={addNewPieceType}
            disabled={!newPieceTypeName.trim()}
            className="rounded border border-app-border-light bg-app-bg-hover px-3 py-1.5 text-app-text-primary text-sm font-medium hover:bg-app-border-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add New Piece Type
          </button>
        </div>
      </section>

      <div className="mt-8 flex items-center gap-3 border-t border-app-border-light pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className="rounded border-0 bg-app-accent-primary px-4 py-2 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!isDirty}
          className="rounded-none border-0 border-b border-app-border-light bg-transparent px-0 py-2 text-app-text-primary text-sm hover:bg-app-bg-hover disabled:opacity-50 disabled:cursor-default"
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
