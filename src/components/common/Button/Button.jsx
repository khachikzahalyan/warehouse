import React, { forwardRef } from 'react';
import './Button.css';

/**
 * Primary UI button. Use for anything the user clicks that isn't navigation.
 * For routing/navigation, prefer <Link> styled as a button via className
 * (NavLink ≠ button semantically). Accepts `loading` to show a spinner and
 * mark aria-busy without swapping the children text.
 *
 * @typedef {'primary'|'secondary'|'ghost'|'danger'} ButtonVariant
 * @typedef {'sm'|'md'|'lg'} ButtonSize
 *
 * @param {{
 *   variant?: ButtonVariant,
 *   size?: ButtonSize,
 *   loading?: boolean,
 *   disabled?: boolean,
 *   iconLeft?: React.ReactNode,
 *   iconRight?: React.ReactNode,
 *   fullWidth?: boolean,
 *   type?: 'button'|'submit'|'reset',
 *   className?: string,
 *   children?: React.ReactNode,
 * } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    loading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden />}
      {!loading && iconLeft && <span className="btn__icon btn__icon--left">{iconLeft}</span>}
      {children != null && <span className="btn__label">{children}</span>}
      {!loading && iconRight && <span className="btn__icon btn__icon--right">{iconRight}</span>}
    </button>
  );
});
