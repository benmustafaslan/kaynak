import { CONTENT_FORMATS, CONTENT_FORMAT_LABELS } from '../types/piece';

const REMOVED_PIECE_TYPES_KEY = 'kaynak_removed_piece_types';
const CUSTOM_PIECE_TYPES_KEY = 'kaynak_custom_piece_types';
const PIECE_TYPE_TEMPLATES_KEY = 'kaynak_piece_type_templates';

const PREDEFINED_PIECE_TYPES = [...CONTENT_FORMATS];

/** Optional headline and/or script template for a piece type (user-customizable in Preferences). */
export interface PieceTypeTemplate {
  headline?: string;
  script?: string;
}

export function loadRemovedPieceTypes(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_PIECE_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRemovedPieceTypes(list: string[]) {
  localStorage.setItem(REMOVED_PIECE_TYPES_KEY, JSON.stringify(list));
}

export function loadCustomPieceTypes(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PIECE_TYPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPieceTypes(list: string[]) {
  localStorage.setItem(CUSTOM_PIECE_TYPES_KEY, JSON.stringify(list));
}

export function loadPieceTypeTemplates(): Record<string, PieceTypeTemplate> {
  try {
    const raw = localStorage.getItem(PIECE_TYPE_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePieceTypeTemplates(templates: Record<string, PieceTypeTemplate>) {
  localStorage.setItem(PIECE_TYPE_TEMPLATES_KEY, JSON.stringify(templates));
}

/** Get template for a piece type id (predefined or custom). Returns undefined if none set. */
export function getPieceTypeTemplate(id: string): PieceTypeTemplate | undefined {
  const all = loadPieceTypeTemplates();
  const t = all[id];
  if (!t || (t.headline === undefined && t.script === undefined)) return undefined;
  return t;
}

/** Predefined list (built-in content formats). */
export function getPredefinedPieceTypes(): string[] {
  return PREDEFINED_PIECE_TYPES;
}

/** Available piece types for dropdowns: predefined + custom minus removed. */
export function getAvailablePieceTypes(): string[] {
  const removed = loadRemovedPieceTypes();
  const custom = loadCustomPieceTypes();
  const all = [...PREDEFINED_PIECE_TYPES, ...custom];
  return all.filter((t) => !removed.includes(t));
}

/** Display label for a piece type (predefined use CONTENT_FORMAT_LABELS, custom use value as-is). */
export function getPieceTypeDisplayLabel(value: string): string {
  if (CONTENT_FORMAT_LABELS[value]) return CONTENT_FORMAT_LABELS[value];
  return value;
}

export { REMOVED_PIECE_TYPES_KEY, CUSTOM_PIECE_TYPES_KEY, PIECE_TYPE_TEMPLATES_KEY };
