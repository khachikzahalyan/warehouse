import React from 'react';
import './Stack.css';

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
 * Vertical stack: children laid out top-to-bottom with a consistent gap.
 *
 * @param {{
 *   gap?: 0|1|2|3|4|5|6|7|8,
 *   align?: 'start'|'center'|'end'|'stretch',
 *   as?: keyof JSX.IntrinsicElements,
 *   className?: string,
 *   children?: React.ReactNode,
 * } & React.HTMLAttributes<HTMLElement>} props
 */
export function Stack({
  gap = 4,
  align = 'stretch',
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={['stack', `stack--align-${align}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{ gap: GAP_VAR[gap] ?? GAP_VAR[4], ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
