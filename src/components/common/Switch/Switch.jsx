import React, { forwardRef } from 'react';
import './Switch.css';

/**
 * On/off switch. Native <input type="checkbox"> under the hood — works with
 * forms, HTML validation, and @testing-library/user-event.click.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   size?: 'sm'|'md',
 *   className?: string,
 * } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'|'type'>} props
 */
export const Switch = forwardRef(function Switch(
  { label, size = 'md', className = '', disabled, ...rest },
  ref
) {
  const classes = [
    'switch',
    `switch--${size}`,
    disabled ? 'switch--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={classes}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className="switch__input"
        disabled={disabled}
        {...rest}
      />
      <span className="switch__track" aria-hidden>
        <span className="switch__thumb" />
      </span>
      {label && <span className="switch__label">{label}</span>}
    </label>
  );
});
