import React from 'react';
import './Card.css';

/**
 * Surface container used by every page to group content. Not opinionated about
 * layout — just the white background, border, radius, padding, optional tone.
 *
 * @typedef {'default'|'muted'|'warning'|'danger'|'success'|'info'} CardTone
 *
 * @param {{
 *   as?: keyof JSX.IntrinsicElements,
 *   padding?: 'none'|'sm'|'md'|'lg',
 *   tone?: CardTone,
 *   className?: string,
 *   children?: React.ReactNode,
 * } & React.HTMLAttributes<HTMLElement>} props
 */
export function Card({
  as: Tag = 'div',
  padding = 'md',
  tone = 'default',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'card',
    `card--pad-${padding}`,
    `card--tone-${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
