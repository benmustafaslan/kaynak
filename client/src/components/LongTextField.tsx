/**
 * Shared component for all user-generated long text areas (Research, Description, Notes, etc.).
 * Use one component so behavior and styling stay consistent: when we add Save button, rich text,
 * or styling in one place, it applies everywhere.
 *
 * - Inline variant: Save button + save on blur (e.g. Story Detail Research, Description).
 * - Form variant: no Save button; parent form submits (e.g. New Story description, Reject reason).
 */
import { useCallback, useState } from 'react';

export interface LongTextFieldProps {
  /** Context label shown to user (e.g. "Research", "Description", "Notes") */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Inline only: called on Save click and on blur */
  onSave?: () => void | Promise<void>;
  placeholder?: string;
  maxLength?: number;
  /** e.g. "3 min" for description; if unset and maxLength set, shows "X / maxLength" */
  charCountLabel?: string;
  rows?: number;
  /** inline = Save button + onBlur save; form = no Save (parent form submits) */
  variant: 'inline' | 'form';
  saving?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Optional label suffix, e.g. "(optional)" */
  labelSuffix?: string;
}

const TEXTAREA_BASE_CLASS =
  'long-text-field-input min-h-[80px] w-full resize-y rounded-sm border border-[var(--border)] bg-transparent px-3 py-2 text-sm leading-normal text-app-text-primary placeholder:text-app-text-tertiary focus:border-[var(--app-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--app-blue)]';

export function LongTextField({
  label,
  value,
  onChange,
  onSave,
  placeholder,
  maxLength,
  charCountLabel,
  rows = 4,
  variant,
  saving = false,
  disabled = false,
  className = '',
  id: idProp,
  labelSuffix,
}: LongTextFieldProps) {
  const [localId] = useState(() => idProp ?? `long-text-${Math.random().toString(36).slice(2, 9)}`);
  const id = idProp ?? localId;

  const handleBlur = useCallback(() => {
    if (variant === 'inline' && onSave) onSave();
  }, [variant, onSave]);

  const handleSaveClick = useCallback(() => {
    if (variant === 'inline' && onSave) void onSave();
  }, [variant, onSave]);

  const showCharCount = maxLength != null || charCountLabel != null;
  const charCountDisplay =
    charCountLabel != null ? `${value.length} / ${charCountLabel}` : maxLength != null ? `${value.length} / ${maxLength}` : '';

  return (
    <div className={`long-text-field ${className}`}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-app-text-secondary">
        {label}
        {labelSuffix ? ` ${labelSuffix}` : ''}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        className={TEXTAREA_BASE_CLASS}
        aria-label={label}
      />
      {(showCharCount || (variant === 'inline' && onSave != null)) && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1">
            {showCharCount && (
              <p className="text-xs text-app-text-tertiary">{charCountDisplay}</p>
            )}
          </span>
          {variant === 'inline' && onSave != null && (
            <div className="flex shrink-0 items-center gap-2">
              {saving && <span className="text-xs text-app-text-tertiary">Saving…</span>}
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={saving || disabled}
                className="rounded-sm bg-app-bg-primary px-2 py-1.5 text-sm font-medium text-app-text-primary transition-[120ms] hover:bg-app-bg-hover disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
