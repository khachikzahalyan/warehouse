import React from 'react';
import './Cluster.css';

const GAP_VAR = {
  0: '0',
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  7: 'var(--space-7)',
  8: 'var(--space-8)',
};

/**
 * Horizontal cluster: children laid out in a row with consistent gap,
 * wraps to a second line when space runs out.
 *
 * @param {{
 *   gap?: 0|1|2|3|4|5|6|7|8,
 *   align?: 'start'|'center'|'end'|'baseline',
 *   justify?: 'start'|'center'|'end'|'between',
 *   wrap?: boolean,
 *   as?: keyof JSX.IntrinsicElements,
 *   className?: string,
 *   children?: React.ReactNode,
 * } & React.HTMLAttributes<HTMLElement>} props
 */
export function Cluster({
  gap = 3,
  align = 'center',
  justify = 'start',
  wrap = true,
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={[
        'cluster',
        `cluster--align-${align}`,
        `cluster--justify-${justify}`,
        wrap ? 'cluster--wrap' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ gap: GAP_VAR[gap] ?? GAP_VAR[3], ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
