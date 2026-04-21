import React, { useId, cloneElement, isValidElement } from 'react';
import { Label } from './Label';
import './FormField.css';

/**
 * Groups label + control + error/helper as one unit. Generates a stable id
 * (via React.useId) so the `<label htmlFor>` and control `id` are linked,
 * and the error/helper text is connected via `aria-describedby`.
 *
 * Children must be a single control element that accepts `id` and
 * `aria-describedby`. Passing more than one child, or a non-element, renders
 * the children raw (no wiring) so FormField stays forgiving.
 *
 * @param {{
 *   label?: React.ReactNode,
 *   htmlFor?: string,
 *   required?: boolean,
 *   error?: React.ReactNode,
 *   helper?: React.ReactNode,
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  helper,
  className = '',
  children,
}) {
  const autoId = useId();
  const inputId = htmlFor || autoId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const describedBy = [error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  const enhancedChild =
    isValidElement(children)
      ? cloneElement(children, {
          id: children.props.id || inputId,
          'aria-describedby': [children.props['aria-describedby'], describedBy]
            .filter(Boolean)
            .join(' ') || undefined,
          invalid: children.props.invalid ?? Boolean(error),
        })
      : children;

  return (
    <div className={['form-field', className].filter(Boolean).join(' ')}>
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}
      {enhancedChild}
      {error && (
        <div id={errorId} className="form-field__error" role="alert">
          {error}
        </div>
      )}
      {helper && !error && (
        <div id={helperId} className="form-field__helper">
          {helper}
        </div>
      )}
    </div>
  );
}
