import React from 'react';
import './FieldGroup.css';

/**
 * Soft tinted panel for grouping related form fields inside modals and
 * drawers. Slate-50 background, 12px radius, 24px internal padding.
 *
 * Notion/Linear "section card" pattern: short uppercase title,
 * optional description, then a vertical stack of fields.
 *
 * @param {{
 *   title?: React.ReactNode,
 *   description?: React.ReactNode,
 *   actions?: React.ReactNode,
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export function FieldGroup({
  title,
  description,
  actions,
  className = '',
  children,
}) {
  const classes = ['field-group', className].filter(Boolean).join(' ');
  return (
    <section className={classes}>
      {(title || description || actions) && (
        <div className="field-group__header">
          <div>
            {title && <h3 className="field-group__title">{title}</h3>}
            {description && (
              <p className="field-group__description">{description}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="field-group__body">{children}</div>
    </section>
  );
}
