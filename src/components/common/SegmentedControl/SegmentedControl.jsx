import React, { useCallback, useRef } from 'react';
import './SegmentedControl.css';

/**
 * Equal-width pill of mutually-exclusive options. Pattern: an iOS-style
 * segmented control rendered as ARIA tablist for screen readers (the
 * activated option is `aria-selected="true"` and arrow keys cycle).
 *
 * Visual: 40px tall (matches Input/Select height for clean alignment in
 * form rows), slate-200 outer border, 8px radius, blue active fill, soft
 * blue focus ring on the focused tab.
 *
 * `trailingAction` is an optional non-tab slot rendered after the options.
 * It is NOT part of the tablist semantics (role="button"), it does not
 * participate in arrow-key cycling, and the host is responsible for
 * gating its visibility (e.g. show only to super_admin). The intended
 * use is a "+" button that opens a "create kind" modal.
 *
 * @template V
 * @param {{
 *   options: Array<{ value: V, label: React.ReactNode, ariaLabel?: string }>,
 *   value: V | null,
 *   onChange: (v: V) => void,
 *   ariaLabel?: string,
 *   disabled?: boolean,
 *   className?: string,
 *   size?: 'sm' | 'md',
 *   trailingAction?: { label: React.ReactNode, ariaLabel?: string, onClick: () => void } | null,
 * }} props
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
  size = 'md',
  trailingAction = null,
}) {
  const refs = useRef(/** @type {HTMLButtonElement[]} */ ([]));

  const onKeyDown = useCallback(
    (e, idx) => {
      if (disabled) return;
      let next = idx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (idx + 1) % options.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (idx - 1 + options.length) % options.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = options.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      const target = refs.current[next];
      if (target) target.focus();
      onChange(options[next].value);
    },
    [options, onChange, disabled],
  );

  const cls = [
    'segmented-control',
    `segmented-control--${size}`,
    disabled ? 'segmented-control--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="tablist" aria-label={ariaLabel} className={cls}>
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected || (value === null && idx === 0) ? 0 : -1}
            disabled={disabled}
            className={`segmented-control__option${selected ? ' is-active' : ''}`}
            onClick={() => !disabled && onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            <span className="segmented-control__label">{opt.label}</span>
          </button>
        );
      })}
      {trailingAction && (
        <button
          type="button"
          aria-label={trailingAction.ariaLabel}
          className="segmented-control__trailing"
          onClick={() => {
            if (!disabled) trailingAction.onClick();
          }}
          disabled={disabled}
        >
          <span className="segmented-control__label">{trailingAction.label}</span>
        </button>
      )}
    </div>
  );
}
