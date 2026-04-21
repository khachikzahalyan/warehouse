import React from 'react';
import './Badge.css';

/**
 * Small status/tag chip. Does not carry a semantic meaning by itself —
 * wrap it in `role="status"` at the call site when appropriate.
 *
 * @typedef {'neutral'|'primary'|'success'|'warning'|'danger'|'info'} BadgeTone
 *
 * @param {{
 *   tone?: BadgeTone,
 *   size?: 'sm'|'md',
 *   className?: string,
 *   children?: React.ReactNode,
 * } & React.HTMLAttributes<HTMLSpanElement>} props
 */
export function Badge({
  tone = 'neutral',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const classes = ['badge', `badge--${tone}`, `badge--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
