import { useEffect, useCallback } from 'react';

export type ModalShellVariant = 'form' | 'detail';

export interface ModalShellProps {
  /** Called when the user requests to close (overlay click or Escape). For detail modals, call save then close here. */
  onRequestClose: () => void;
  /** 'form' = standard form/dialog box; 'detail' = full-page style with optional maxWidth */
  variant: ModalShellVariant;
  /** Only for variant="detail": max width of the content box (e.g. "900px", "1080px") */
  maxWidth?: string;
  /** Override z-index (default from CSS). Use 1100 for detail modals so form modals can stack above. */
  zIndex?: number;
  /** Extra class names for the content box (e.g. "max-w-md") */
  contentClassName?: string;
  /** For accessibility: id of the element that labels the dialog */
  'aria-labelledby'?: string;
  children: React.ReactNode;
}

/**
 * Single shared shell for all app popups. Overlay, padding, Escape, overlay click,
 * and content box styling live here so one change applies to every modal.
 */
export function ModalShell({
  onRequestClose,
  variant,
  maxWidth,
  zIndex,
  contentClassName = '',
  'aria-labelledby': ariaLabelledBy,
  children,
}: ModalShellProps) {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;
      onRequestClose();
    },
    [onRequestClose]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onRequestClose]);

  const overlayClass = [
    'modal-overlay',
    'animate-fade-in',
    variant === 'detail' ? 'backdrop-blur-[2px]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const overlayStyle = zIndex != null ? { zIndex } : undefined;

  const contentClass =
    variant === 'form'
      ? `modal animate-slide-up ${contentClassName}`.trim()
      : `modal-detail animate-fade-in ${contentClassName}`.trim();

  const contentStyle = variant === 'detail' && maxWidth ? { maxWidth } : undefined;

  return (
    <div
      className={overlayClass}
      style={overlayStyle}
      onClick={handleOverlayClick}
      aria-hidden={variant === 'detail'}
    >
      <div
        className={contentClass}
        style={contentStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
