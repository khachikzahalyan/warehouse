import React from 'react';
import './EmptyState.css';

/**
 * Generic empty / coming-soon panel. Used on placeholder pages, "no results"
 * states inside tables, and 404/403 landing.
 *
 * @param {{
 *   icon?: React.ReactNode,
 *   badge?: React.ReactNode,
 *   title: React.ReactNode,
 *   description?: React.ReactNode,
 *   action?: React.ReactNode,
 *   className?: string,
 *   compact?: boolean,
 * }} props
 */
export function EmptyState({
  icon,
  badge,
  title,
  description,
  action,
  className = '',
  compact = false,
}) {
  const classes = [
    'empty-state',
    compact ? 'empty-state--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes}>
      {icon && <div className="empty-state__icon" aria-hidden>{icon}</div>}
      {badge && <div className="empty-state__badge">{badge}</div>}
      <h2 className="empty-state__title">{title}</h2>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
