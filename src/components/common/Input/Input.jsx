import React, { forwardRef } from 'react';
import './Input.css';

/**
 * Text input with size tokens + optional prefix/suffix slots. Dumb — pairs
 * with <FormField> for label / error / helper wiring.
 *
 * @typedef {'sm'|'md'|'lg'} InputSize
 *
 * @param {{
 *   size?: InputSize,
 *   invalid?: boolean,
 *   prefix?: React.ReactNode,
 *   suffix?: React.ReactNode,
 *   fullWidth?: boolean,
 *   className?: string,
 * } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>} props
 */
export const Input = forwardRef(function Input(
  {
    size = 'md',
    invalid = false,
    prefix,
    suffix,
    fullWidth = true,
    className = '',
    type = 'text',
    ...rest
  },
  ref
) {
  const wrapClasses = [
    'input',
    `input--${size}`,
    invalid ? 'input--invalid' : '',
    fullWidth ? 'input--full' : '',
    (prefix || suffix) ? 'input--has-affix' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={wrapClasses}>
      {prefix && <span className="input__affix input__affix--left">{prefix}</span>}
      <input
        ref={ref}
        type={type}
        className="input__el"
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {suffix && <span className="input__affix input__affix--right">{suffix}</span>}
    </span>
  );
});
