import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Drawer.css';

/**
 * CSS selector matching focusable DOM nodes inside the drawer panel.
 * Kept in sync with the Modal helper to avoid diverging focus logic.
 */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Side-panel dialog that slides in from the right (default) or left edge.
 *
 * Behaviour:
 *   - Rendered via a portal into document.body.
 *   - Escape key → onClose.
 *   - Backdrop click → onClose (when `dismissOnBackdrop !== false`).
 *   - Body scroll is locked while open.
 *   - Focus moves into the panel on open and is restored to the previously
 *     focused element on close.
 *   - Tab / Shift+Tab cycles focus inside the panel (true focus trap —
 *     stricter than <Modal>).
 *   - Mobile (< 768px) falls back to a full-screen modal layout instead of a
 *     side-anchored panel; the slide animation is swapped for a fade.
 *
 * Not intended as a general-purpose popover — use for asset detail, search
 * pickers, offboarding checklists, and similar focused flows where the user
 * must acknowledge or dismiss before returning to the underlying page.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: React.ReactNode,
 *   side?: 'right' | 'left',
 *   width?: 'sm' | 'md' | 'lg',
 *   footer?: React.ReactNode,
 *   dismissOnBackdrop?: boolean,
 *   className?: string,
 *   children?: React.ReactNode,
 *   'aria-label'?: string,
 * }} props
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  width = 'md',
  footer,
  dismissOnBackdrop = true,
  className = '',
  children,
  'aria-label': ariaLabel,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector(FOCUSABLE);
      (first || panel).focus();
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      const node = panelRef.current;
      if (!node) return;
      const focusables = node.querySelectorAll(FOCUSABLE);
      if (focusables.length === 0) {
        // Keep focus inside the panel even when it has no focusable children
        // (e.g. a drawer showing only read-only text); blocking default stops
        // the tab from leaking back to the underlying page.
        e.preventDefault();
        node.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          /** @type {HTMLElement} */ (last).focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          /** @type {HTMLElement} */ (first).focus();
        }
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

  const onBackdropMouseDown = (e) => {
    if (!dismissOnBackdrop) return;
    if (e.target === e.currentTarget) onClose();
  };

  const panelClass = [
    'drawer',
    `drawer--${side}`,
    `drawer--${width}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const node = (
    <div
      className="drawer-backdrop"
      onMouseDown={onBackdropMouseDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? 'drawer-title' : undefined}
        tabIndex={-1}
      >
        {(title || onClose) && (
          <header className="drawer__header">
            {title && (
              <h2 id="drawer-title" className="drawer__title">
                {title}
              </h2>
            )}
            <button
              type="button"
              className="drawer__close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12" />
                <path d="M6 18L18 6" />
              </svg>
            </button>
          </header>
        )}
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__footer">{footer}</footer>}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
