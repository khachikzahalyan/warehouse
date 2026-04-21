import React from 'react';
import './Divider.css';

/**
 * Thin rule — horizontal or vertical. No semantic heading support; if you
 * need a labelled section separator, use a heading + divider together.
 *
 * @param {{
 *   orientation?: 'horizontal'|'vertical',
 *   className?: string,
 * }} props
 */
export function Divider({ orientation = 'horizontal', className = '' }) {
  return (
    <span
      role="separator"
      aria-orientation={orientation}
      className={['divider', `divider--${orientation}`, className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
