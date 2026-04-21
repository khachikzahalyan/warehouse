import React, { forwardRef } from 'react';
import './Checkbox.css';

/**
 * Styled native checkbox. Pair with <Label> or use the built-in label slot.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   size?: 'sm'|'md',
 *   invalid?: boolean,
 *   className?: string,
 * } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'|'type'>} props
 */
export const Checkbox = forwardRef(function Checkbox(
  { label, size = 'md', invalid = false, className = '', disabled, ...rest },
  ref
) {
  const classes = [
    'checkbox',
    `checkbox--${size}`,
    invalid ? 'checkbox--invalid' : '',
    disabled ? 'checkbox--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={classes}>
      <input
        ref={ref}
        type="checkbox"
        className="checkbox__input"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <span className="checkbox__box" aria-hidden>
        <svg viewBox="0 0 16 16" className="checkbox__tick">
          <path d="M3 8.5L6.5 12L13 4.5" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label && <span className="checkbox__label">{label}</span>}
    </label>
  );
});
