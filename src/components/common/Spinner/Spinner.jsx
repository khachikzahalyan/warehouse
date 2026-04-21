import React from 'react';
import './Spinner.css';

/**
 * Loading indicator. Sizes map to 16/20/28 px.
 *
 * @param {{
 *   size?: 'sm'|'md'|'lg',
 *   label?: string,
 *   className?: string,
 * }} props
 */
export function Spinner({ size = 'md', label, className = '' }) {
  const classes = ['spinner', `spinner--${size}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span
      className={classes}
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
