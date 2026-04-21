import React, { useId, useState, useRef, useCallback, cloneElement, isValidElement } from 'react';
import './Tooltip.css';

/**
 * Simple hover/focus tooltip. Wraps a single child; shows `label` in a
 * small bubble above it. Not a full positioning engine — the bubble
 * uses CSS absolute positioning and may overflow on tight screens.
 *
 * @param {{
 *   label: React.ReactNode,
 *   placement?: 'top'|'bottom'|'left'|'right',
 *   children: React.ReactElement,
 *   className?: string,
 * }} props
 */
export function Tooltip({ label, placement = 'top', children, className = '' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const hideTimer = useRef(null);

  const show = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setOpen(false), 60);
  }, []);

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children, {
    onMouseEnter: (e) => {
      children.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e) => {
      children.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e) => {
      children.props.onFocus?.(e);
      show();
    },
    onBlur: (e) => {
      children.props.onBlur?.(e);
      hide();
    },
    'aria-describedby': [children.props['aria-describedby'], open ? id : null]
      .filter(Boolean)
      .join(' ') || undefined,
  });

  return (
    <span className={['tooltip', className].filter(Boolean).join(' ')}>
      {trigger}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`tooltip__bubble tooltip__bubble--${placement}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
