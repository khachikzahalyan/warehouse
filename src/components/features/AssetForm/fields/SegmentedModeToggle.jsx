import React from 'react';

/**
 * Two-option segmented control for choosing between tracked/non-tracked modes.
 *
 * @param {{
 *   value: 'tracked' | 'non-tracked',
 *   onChange: (mode: 'tracked' | 'non-tracked') => void,
 *   labels: { tracked: string, nonTracked: string },
 * }} props
 */
export function SegmentedModeToggle({ value, onChange, labels }) {
  return (
    <div role="tablist" aria-label="Asset mode" className="segmented-toggle">
      {[
        { id: 'tracked', label: labels.tracked },
        { id: 'non-tracked', label: labels.nonTracked },
      ].map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={value === opt.id}
          className={`segmented-toggle__btn${value === opt.id ? ' is-active' : ''}`}
          type="button"
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
