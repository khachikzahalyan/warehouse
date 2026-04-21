import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/**
 * Accessible modal dialog.
 *
 * Renders a centered panel over a dimmed backdrop. Closes on:
 *   - Escape key
 *   - Backdrop (outside-panel) click, if `dismissOnBackdrop !== false`
 * Focus is moved into the dialog on open; previous focus restored on close.
 *
 * Not a full focus-trap (no Tab cycling), but good enough for short
 * confirm / transfer / create-item flows where the first focusable element
 * is next to the close button.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: React.ReactNode,
 *   size?: 'sm'|'md'|'lg',
 *   footer?: React.ReactNode,
 *   dismissOnBackdrop?: boolean,
 *   className?: string,
 *   children?: React.ReactNode,
 *   'aria-label'?: string,
 * }} props
 */
export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  footer,
  dismissOnBackdrop = true,
  className = '',
  children,
  'aria-label': ariaLabel,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Escape to close + manage focus
  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const focusable = panel.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || panel).focus();
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      const el = previouslyFocused.current;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e) => {
    if (!dismissOnBackdrop) return;
    if (e.target === e.currentTarget) onClose();
  };

  const node = (
    <div
      className="modal-backdrop"
      onMouseDown={onBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={['modal', `modal--${size}`, className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {(title || onClose) && (
          <header className="modal__header">
            {title && (
              <h2 id="modal-title" className="modal__title">
                {title}
              </h2>
            )}
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12" />
                <path d="M6 18L18 6" />
              </svg>
            </button>
          </header>
        )}
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
