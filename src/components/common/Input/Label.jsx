import React from 'react';
import './Label.css';

/**
 * Form label token. Renders a native <label>. Use with <Input>/<Select>/<Switch>.
 *
 * @param {{
 *   htmlFor?: string,
 *   required?: boolean,
 *   className?: string,
 *   children?: React.ReactNode,
 * } & React.LabelHTMLAttributes<HTMLLabelElement>} props
 */
export function Label({ htmlFor, required, className = '', children, ...rest }) {
  return (
    <label
      htmlFor={htmlFor}
      className={['label', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
      {required && <span className="label__required" aria-hidden>*</span>}
    </label>
  );
}
