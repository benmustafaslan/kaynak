import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPredefinedPieceTypes,
  getPieceTypeDisplayLabel,
  type PieceTypeTemplate,
  loadRemovedPieceTypes as loadRemovedPieceTypesStorage,
  loadCustomPieceTypes as loadCustomPieceTypesStorage,
  loadPieceTypeTemplates as loadPieceTypeTemplatesStorage,
  saveRemovedPieceTypes as saveRemovedPieceTypesStorage,
  saveCustomPieceTypes as saveCustomPieceTypesStorage,
  savePieceTypeTemplates as savePieceTypeTemplatesStorage,
} from '../utils/pieceTypesPreferences';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { workspacesApi, type WorkspaceMemberItem } from '../utils/workspacesApi';
import { ModalShell } from '../components/ModalShell';

const ROLE_OPTIONS = ['Producer', 'Editor', 'Videographer', 'Reporter', 'Researcher'] as const;
const REMOVED_ROLE_TYPES_KEY = 'kaynak_removed_role_types';
const CONFIRM_DELETE_PHRASE = 'delete this workspace';
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

function snapshot(removed: string[], custom: string[], templates: Record<string, PieceTypeTemplate>) {
  return JSON.stringify({ removed, custom, templates });
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

function loadPieceTypeTemplates(): Record<string, PieceTypeTemplate> {
  return loadPieceTypeTemplatesStorage();
}

function savePieceTypeTemplates(templates: Record<string, PieceTypeTemplate>) {
  savePieceTypeTemplatesStorage(templates);
}

/** Short preview of template (headline or first line of script). Empty if no template. */
function templatePreview(template: PieceTypeTemplate | undefined): string {
  if (!template) return '';
  const h = (template.headline ?? '').trim();
  const s = (template.script ?? '').trim();
  if (h) return h.length > 50 ? h.slice(0, 50) + '…' : h;
  if (s) {
    const firstLine = s.split('\n')[0].trim();
    return firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine;
  }
  return '';
}

interface EditPieceTypeTemplateModalContentProps {
  typeId: string;
  typeLabel: string;
  initialHeadline: string;
  initialScript: string;
  onApplyAndClose: (headline: string, script: string) => void;
  onRemovePieceType: (typeId: string) => void;
}

const EditPieceTypeTemplateModalContent = forwardRef<
  { getValuesAndApply: () => void },
  EditPieceTypeTemplateModalContentProps
>(function EditPieceTypeTemplateModalContent(
  { typeId, typeLabel, initialHeadline, initialScript, onApplyAndClose, onRemovePieceType },
  ref
) {
  const [headline, setHeadline] = useState(initialHeadline);
  const [script, setScript] = useState(initialScript);

  useImperativeHandle(ref, () => ({
    getValuesAndApply: () => onApplyAndClose(headline, script),
  }), [headline, script, onApplyAndClose]);

  const handleRemove = () => {
    if (window.confirm(`Hide "${typeLabel}" from the piece type dropdown? Save preferences to apply.`)) {
      onRemovePieceType(typeId);
    }
  };

  return (
    <>
      <div className="modal-header">
        <h2 id="edit-piece-type-template-title" className="modal-title">Edit template: {typeLabel}</h2>
      </div>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="form-label">Default headline (optional)</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. [Story title] – Reels cut"
            className="form-input w-full"
            maxLength={500}
          />
        </div>
        <div>
          <label className="form-label">Default script (optional)</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="e.g. Hook: …&#10;Main: …&#10;CTA: …"
            className="form-input w-full min-h-[120px] resize-y"
            rows={5}
          />
        </div>
        <div className="pt-1">
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-app-text-secondary hover:text-app-text-primary focus:outline-none focus:underline"
          >
            Remove piece type
          </button>
        </div>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          onClick={() => onApplyAndClose(headline, script)}
          className="btn btn-primary"
        >
          Done
        </button>
      </div>
    </>
  );
});

export default function Preferences() {
  const navigate = useNavigate();
  const currentWorkspace = useWorkspaceStore((s) => s.current);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const [pendingRemovedRoleTypes, setPendingRemovedRoleTypes] = useState<string[]>([]);
  const [customRoleTypes, setCustomRoleTypes] = useState<string[]>(loadCustomRoleTypes);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [addRoleName, setAddRoleName] = useState('');
  const [addRoleError, setAddRoleError] = useState('');
  const [pendingRemovedPieceTypes, setPendingRemovedPieceTypes] = useState<string[]>([]);
  const [customPieceTypes, setCustomPieceTypes] = useState<string[]>(loadCustomPieceTypes);
  const [pieceTypeTemplates, setPieceTypeTemplates] = useState<Record<string, PieceTypeTemplate>>(loadPieceTypeTemplates);
  const [editingPieceTypeId, setEditingPieceTypeId] = useState<string | null>(null);
  const [showAddPieceTypeModal, setShowAddPieceTypeModal] = useState(false);
  const [addPieceTypeName, setAddPieceTypeName] = useState('');
  const [addPieceTypeError, setAddPieceTypeError] = useState('');
  const [, setSaveVersion] = useState(0);
  const lastSavedRef = useRef<string | null>(null);
  const editPieceTypeModalRef = useRef<{ getValuesAndApply: () => void } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const savedRemovedRoleTypes = loadRemovedRoleTypes();
  const savedRemovedPieceTypes = loadRemovedPieceTypes();
  const effectiveRemovedRoleTypes = [...new Set([...savedRemovedRoleTypes, ...pendingRemovedRoleTypes])];
  const effectiveRemovedPieceTypes = [...new Set([...savedRemovedPieceTypes, ...pendingRemovedPieceTypes])];

  if (lastSavedRef.current === null) {
    lastSavedRef.current = JSON.stringify({
      roles: snapshot(effectiveRemovedRoleTypes, customRoleTypes),
      pieceTypes: snapshot(effectiveRemovedPieceTypes, customPieceTypes, pieceTypeTemplates),
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
    pieceTypes: snapshot(effectiveRemovedPieceTypes, customPieceTypes, pieceTypeTemplates),
  });
  const isDirty = currentSnapshot !== lastSavedRef.current;

  const handleSave = useCallback(() => {
    saveRemovedRoleTypes(effectiveRemovedRoleTypes);
    saveCustomRoleTypes(customRoleTypes);
    saveRemovedPieceTypes(effectiveRemovedPieceTypes);
    saveCustomPieceTypes(customPieceTypes);
    savePieceTypeTemplates(pieceTypeTemplates);
    lastSavedRef.current = currentSnapshot;
    setPendingRemovedRoleTypes([]);
    setPendingRemovedPieceTypes([]);
    setSaveVersion((v) => v + 1);
  }, [effectiveRemovedRoleTypes, customRoleTypes, effectiveRemovedPieceTypes, customPieceTypes, pieceTypeTemplates, currentSnapshot]);

  const handleDiscard = useCallback(() => {
    setPendingRemovedRoleTypes([]);
    setCustomRoleTypes(loadCustomRoleTypes());
    setPendingRemovedPieceTypes([]);
    setCustomPieceTypes(loadCustomPieceTypes());
    setPieceTypeTemplates(loadPieceTypeTemplates());
    lastSavedRef.current = JSON.stringify({
      roles: snapshot(loadRemovedRoleTypes(), loadCustomRoleTypes()),
      pieceTypes: snapshot(loadRemovedPieceTypes(), loadCustomPieceTypes(), loadPieceTypeTemplates()),
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

  const addNewRoleWithName = useCallback((name: string) => {
    const n = name.trim();
    if (!n) return false;
    if (predefinedSet.has(n as (typeof ROLE_OPTIONS)[number]) || customRoleTypes.includes(n)) return false;
    setCustomRoleTypes((prev) => [...prev, n].sort());
    setShowAddRoleModal(false);
    return true;
  }, [customRoleTypes, predefinedSet]);

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

  const addNewPieceTypeWithName = useCallback((name: string) => {
    const n = name.trim();
    if (!n) return false;
    if (predefinedPieceSet.has(n) || customPieceTypes.includes(n)) return false;
    setCustomPieceTypes((prev) => [...prev, n].sort());
    setShowAddPieceTypeModal(false);
    return true;
  }, [customPieceTypes, predefinedPieceSet]);

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
    setPieceTypeTemplates((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    setSaveVersion((v) => v + 1);
  }, []);

  const updatePieceTypeTemplate = useCallback((typeId: string, updates: Partial<PieceTypeTemplate>) => {
    setPieceTypeTemplates((prev) => {
      const current = prev[typeId] ?? {};
      const next = { ...current, ...updates };
      const isEmpty = (next.headline ?? '').trim() === '' && (next.script ?? '').trim() === '';
      const nextAll = { ...prev };
      if (isEmpty) delete nextAll[typeId];
      else nextAll[typeId] = next;
      return nextAll;
    });
  }, []);

  const applyPieceTypeTemplateAndCloseModal = useCallback((headline: string, script: string) => {
    if (!editingPieceTypeId) return;
    setPieceTypeTemplates((prev) => {
      const next = { ...prev };
      const h = headline.trim();
      const s = script.trim();
      if (h === '' && s === '') delete next[editingPieceTypeId];
      else next[editingPieceTypeId] = { headline: h || undefined, script: s || undefined };
      return next;
    });
    setEditingPieceTypeId(null);
  }, [editingPieceTypeId]);

  const handleDeleteWorkspace = useCallback(async () => {
    if (deleteConfirmText.trim() !== CONFIRM_DELETE_PHRASE || !currentWorkspace) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteWorkspace(currentWorkspace._id);
      navigate('/w', { replace: true });
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirmText, currentWorkspace, deleteWorkspace, navigate]);

  const isOwner = currentWorkspace?.role === 'owner';
  const currentUserId = useAuthStore((s) => s.user?._id ?? '');
  const [members, setMembers] = useState<WorkspaceMemberItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?._id || !isOwner) return;
    setMembersLoading(true);
    setMembersError(null);
    try {
      const list = await workspacesApi.listMembers(currentWorkspace._id);
      setMembers(list);
    } catch (e) {
      setMembersError(e instanceof Error ? e.message : 'Failed to load members');
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [currentWorkspace?._id, isOwner]);

  useEffect(() => {
    if (isOwner && currentWorkspace?._id) fetchMembers();
  }, [isOwner, currentWorkspace?._id, fetchMembers]);

  const handleMemberRoleChange = useCallback(
    async (userId: string, newRole: string) => {
      if (!currentWorkspace?._id) return;
      setUpdatingMemberId(userId);
      try {
        await workspacesApi.updateMemberRole(currentWorkspace._id, userId, newRole);
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m))
        );
      } catch {
        setMembersError('Failed to update role');
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [currentWorkspace?._id]
  );

  const actionBar = (
    <div className="preferences-action-bar-inner">
      {isDirty && (
        <span className="preferences-unsaved-msg">Unsaved changes. These affect all stories.</span>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty}
        className="btn btn-primary"
      >
        Save
      </button>
      <button
        type="button"
        onClick={handleDiscard}
        disabled={!isDirty}
        className="btn btn-secondary"
      >
        Discard
      </button>
    </div>
  );

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Preferences</h1>
        <p className="page-subtitle">
          Board and workflow settings. Configure role types, piece types, and other options here.
        </p>
        <div className="preferences-header-actions">
          {actionBar}
        </div>
      </header>

      <div className="page-content-narrow">
        <section className="series-page-section" aria-labelledby="prefs-roles-heading">
          <h2 id="prefs-roles-heading" className="series-page-section-title">Manage role types</h2>
          <p className="archive-section-desc">
            Add custom role types or remove built-in ones to control the role dropdown when assigning people on stories.
          </p>
          <div className="preferences-field">
            <span className="preferences-field-label">Available: </span>
            {availableRoles.length === 0 ? (
              <span className="preferences-field-muted">None</span>
            ) : (
              <div className="preferences-tags">
                {availableRoles.map((r) => (
                  <span key={r} className="preferences-tag">
                    {r}
                    <button
                      type="button"
                      onClick={() => removeRoleType(r)}
                      className="preferences-tag-btn"
                      aria-label={`Remove ${r}`}
                    >
                      ×
                    </button>
                    {customRoleTypes.includes(r) && (
                      <button
                        type="button"
                        onClick={() => removeCustomRole(r)}
                        className="preferences-tag-btn"
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
            <div className="preferences-field">
              <span className="preferences-field-label">Removed (unsaved): </span>
              <div className="preferences-tags">
                {pendingRemovedRoleTypes.map((r) => (
                  <span key={r} className="preferences-tag preferences-tag-unsaved">
                    {r}
                    <button
                      type="button"
                      onClick={() => restorePendingRoleType(r)}
                      className="preferences-tag-btn preferences-tag-restore"
                      aria-label={`Restore ${r}`}
                    >
                      Restore
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setAddRoleName(''); setAddRoleError(''); setShowAddRoleModal(true); }}
            className="btn btn-secondary"
          >
            Add New Role
          </button>
        </section>

        {showAddRoleModal && (
          <ModalShell variant="form" onRequestClose={() => setShowAddRoleModal(false)} aria-labelledby="add-role-title">
            <div className="modal-header">
              <h2 id="add-role-title" className="modal-title">New role</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAddRoleError('');
                const ok = addNewRoleWithName(addRoleName);
                if (!ok) setAddRoleError(addRoleName.trim() ? 'That role already exists.' : 'Name is required.');
              }}
            >
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label" htmlFor="add-role-name">Role name</label>
                  <input
                    id="add-role-name"
                    type="text"
                    value={addRoleName}
                    onChange={(e) => { setAddRoleName(e.target.value); setAddRoleError(''); }}
                    placeholder="e.g. Copy editor"
                    className="form-input w-full"
                    maxLength={100}
                    autoFocus
                  />
                </div>
                {addRoleError && <p className="text-sm text-red-600" role="alert">{addRoleError}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddRoleModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={!addRoleName.trim()} className="btn btn-primary">
                  Add
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        <section className="series-page-section" aria-labelledby="prefs-piece-types-heading">
          <h2 id="prefs-piece-types-heading" className="series-page-section-title">Manage piece types</h2>
          <p className="archive-section-desc">
            Add or remove piece types and set optional templates (default headline and script) for each. Click a type to edit its template. Save at the top to apply changes.
          </p>

          {availablePieceTypes.length === 0 ? (
            <p className="preferences-field-muted text-sm">No piece types. Add one below.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availablePieceTypes.map((t) => {
                const label = getPieceTypeDisplayLabel(t);
                const preview = templatePreview(pieceTypeTemplates[t]);
                const isCustom = customPieceTypes.includes(t);
                return (
                  <div
                    key={t}
                    className="inline-flex items-center gap-1 rounded border border-app-border bg-app-bg-secondary py-1.5 px-2 transition-colors hover:border-app-border-strong hover:bg-app-bg-tertiary"
                  >
                    <button
                      type="button"
                      onClick={() => setEditingPieceTypeId(t)}
                      className="text-left text-sm rounded focus:outline-none focus:ring-1 focus:ring-app-accent"
                    >
                      <span className="font-medium text-app-text-primary">{label}</span>
                      {preview && <span className="text-app-text-secondary ml-1.5 max-w-[120px] truncate inline-block">· {preview}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePieceType(t); }}
                      className="shrink-0 rounded p-0.5 text-app-text-secondary hover:bg-app-bg-primary hover:text-app-text-primary text-sm"
                      aria-label={`Hide ${label}`}
                      title="Hide from dropdown"
                    >
                      ×
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeCustomPieceType(t); }}
                        className="shrink-0 rounded p-0.5 text-app-text-secondary hover:bg-app-bg-primary hover:text-app-text-primary text-sm"
                        aria-label={`Delete ${label} permanently`}
                        title="Delete this piece type permanently"
                      >
                        ⌫
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pendingRemovedPieceTypes.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-medium text-app-text-secondary">Removed (unsaved): </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {pendingRemovedPieceTypes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs">
                    {getPieceTypeDisplayLabel(t)}
                    <button
                      type="button"
                      onClick={() => restorePendingPieceType(t)}
                      className="rounded px-1 py-0.5 text-app-text-secondary hover:bg-amber-500/20 hover:text-app-text-primary"
                      aria-label={`Restore ${getPieceTypeDisplayLabel(t)}`}
                    >
                      Restore
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setAddPieceTypeName(''); setAddPieceTypeError(''); setShowAddPieceTypeModal(true); }}
            className="btn btn-secondary mt-3"
          >
            Add New Piece Type
          </button>
        </section>

        {showAddPieceTypeModal && (
          <ModalShell variant="form" onRequestClose={() => setShowAddPieceTypeModal(false)} aria-labelledby="add-piece-type-title">
            <div className="modal-header">
              <h2 id="add-piece-type-title" className="modal-title">New piece type</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAddPieceTypeError('');
                const ok = addNewPieceTypeWithName(addPieceTypeName);
                if (!ok) setAddPieceTypeError(addPieceTypeName.trim() ? 'That piece type already exists.' : 'Name is required.');
              }}
            >
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label" htmlFor="add-piece-type-name">Piece type name</label>
                  <input
                    id="add-piece-type-name"
                    type="text"
                    value={addPieceTypeName}
                    onChange={(e) => { setAddPieceTypeName(e.target.value); setAddPieceTypeError(''); }}
                    placeholder="e.g. Podcast"
                    className="form-input w-full"
                    maxLength={64}
                    autoFocus
                  />
                </div>
                {addPieceTypeError && <p className="text-sm text-red-600" role="alert">{addPieceTypeError}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddPieceTypeModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={!addPieceTypeName.trim()} className="btn btn-primary">
                  Add
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {editingPieceTypeId && (
          <ModalShell
            variant="form"
            onRequestClose={() => editPieceTypeModalRef.current?.getValuesAndApply()}
            aria-labelledby="edit-piece-type-template-title"
          >
            <EditPieceTypeTemplateModalContent
              ref={editPieceTypeModalRef}
              key={editingPieceTypeId}
              typeId={editingPieceTypeId}
              typeLabel={getPieceTypeDisplayLabel(editingPieceTypeId)}
              initialHeadline={pieceTypeTemplates[editingPieceTypeId]?.headline ?? ''}
              initialScript={pieceTypeTemplates[editingPieceTypeId]?.script ?? ''}
              onApplyAndClose={applyPieceTypeTemplateAndCloseModal}
              onRemovePieceType={(typeId) => {
                setPendingRemovedPieceTypes((prev) => (prev.includes(typeId) ? prev : [...prev, typeId]));
                setEditingPieceTypeId(null);
              }}
            />
          </ModalShell>
        )}

        {isOwner && (
          <section className="series-page-section" aria-labelledby="prefs-members-heading">
            <h2 id="prefs-members-heading" className="series-page-section-title">Workspace members</h2>
            <p className="archive-section-desc">
              Change a member’s role. Only owners can promote others to owner.
            </p>
            {membersError && (
              <p className="preferences-danger-error mb-3" role="alert">
                {membersError}
              </p>
            )}
            {membersLoading ? (
              <p className="preferences-field-muted">Loading members…</p>
            ) : (
              <ul className="preferences-members-list">
                {members.map((m) => (
                  <li key={m._id} className="preferences-members-row">
                    <div className="preferences-members-info">
                      <span className="preferences-members-name">
                        {m.name || m.email || 'Unknown'}
                        {m.userId === currentUserId && (
                          <span className="preferences-members-you"> (you)</span>
                        )}
                      </span>
                      {m.email && m.name && (
                        <span className="preferences-members-email">{m.email}</span>
                      )}
                    </div>
                    <div className="preferences-members-role">
                      {m.userId === currentUserId ? (
                        <span className="preferences-field-muted">{m.role}</span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleMemberRoleChange(m.userId, e.target.value)}
                          disabled={updatingMemberId === m.userId}
                          className="form-input preferences-role-select"
                          aria-label={`Role for ${m.name || m.email}`}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="preferences-action-bar-bottom">
          {actionBar}
        </div>

        {isOwner && (
          <section className="series-page-section preferences-danger-zone" aria-labelledby="prefs-danger-heading">
            <h2 id="prefs-danger-heading" className="series-page-section-title preferences-danger-title">Danger Zone</h2>
            <p className="archive-section-desc">
              Deleting this workspace permanently removes all stories, pieces, and data. This cannot be undone.
            </p>
            <div className="preferences-danger-block">
              <p className="preferences-field-label">Delete this workspace</p>
              <p className="archive-section-desc">
                Type <strong style={{ color: 'var(--app-text-primary)' }}>{CONFIRM_DELETE_PHRASE}</strong> below to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  setDeleteError(null);
                }}
                placeholder={CONFIRM_DELETE_PHRASE}
                className="form-input preferences-danger-input"
                aria-label="Confirmation phrase"
              />
              {deleteError && (
                <p className="preferences-danger-error" role="alert">
                  {deleteError}
                </p>
              )}
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={deleteConfirmText.trim() !== CONFIRM_DELETE_PHRASE || deleteLoading}
                className="btn btn-danger preferences-danger-btn"
              >
                {deleteLoading ? 'Deleting…' : 'Delete this workspace'}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
