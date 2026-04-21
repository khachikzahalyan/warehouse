import React from 'react';
import './PageHeader.css';

/**
 * Standard page heading: title, optional subtitle, and an `actions` slot
 * on the right for primary/secondary buttons. Keeps page layouts consistent.
 *
 * @param {{
 *   title: React.ReactNode,
 *   subtitle?: React.ReactNode,
 *   actions?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <header className={['page-header', className].filter(Boolean).join(' ')}>
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
