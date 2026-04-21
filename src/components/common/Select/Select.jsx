import React, { forwardRef } from 'react';
import './Select.css';

/**
 * Styled native <select>. Use for 2-20 option lists. Larger lists should
 * move to a search combobox (src/components/common/SearchableSelect, planned).
 *
 * @typedef {'sm'|'md'|'lg'} SelectSize
 *
 * @param {{
 *   size?: SelectSize,
 *   invalid?: boolean,
 *   iconLeft?: React.ReactNode,
 *   fullWidth?: boolean,
 *   className?: string,
 *   children?: React.ReactNode,
 * } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>} props
 */
export const Select = forwardRef(function Select(
  {
    size = 'md',
    invalid = false,
    iconLeft,
    fullWidth = true,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    'select',
    `select--${size}`,
    invalid ? 'select--invalid' : '',
    fullWidth ? 'select--full' : '',
    iconLeft ? 'select--has-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {iconLeft && (
        <span className="select__icon select__icon--left" aria-hidden>
          {iconLeft}
        </span>
      )}
      <select
        ref={ref}
        className="select__el"
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <span className="select__chevron" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </span>
  );
});
