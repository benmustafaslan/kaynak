import { CONTENT_FORMATS, CONTENT_FORMAT_LABELS } from '../types/piece';

const REMOVED_PIECE_TYPES_KEY = 'kaynak_removed_piece_types';
const CUSTOM_PIECE_TYPES_KEY = 'kaynak_custom_piece_types';

const PREDEFINED_PIECE_TYPES = [...CONTENT_FORMATS];

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

export { REMOVED_PIECE_TYPES_KEY, CUSTOM_PIECE_TYPES_KEY };
