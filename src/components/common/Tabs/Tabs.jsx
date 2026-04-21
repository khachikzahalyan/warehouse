import React, { useState, useId, useCallback } from 'react';
import './Tabs.css';

/**
 * Controlled + uncontrolled tab group.
 *
 * Pass `value`/`onChange` to control externally, or `defaultValue` to let
 * Tabs manage its own state. `tabs` is a list of `{ value, label, panel }`.
 *
 * @param {{
 *   tabs: Array<{ value: string, label: React.ReactNode, panel?: React.ReactNode, disabled?: boolean }>,
 *   value?: string,
 *   defaultValue?: string,
 *   onChange?: (value: string) => void,
 *   className?: string,
 *   'aria-label'?: string,
 * }} props
 */
export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  className = '',
  'aria-label': ariaLabel,
}) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = value !== undefined ? value : internal;
  const baseId = useId();

  const select = useCallback(
    (v) => {
      if (value === undefined) setInternal(v);
      onChange?.(v);
    },
    [value, onChange]
  );

  const activeTab = tabs.find((t) => t.value === active) || tabs[0];

  return (
    <div className={['tabs', className].filter(Boolean).join(' ')}>
      <div className="tabs__list" role="tablist" aria-label={ariaLabel}>
        {tabs.map((t) => {
          const isActive = t.value === active;
          const tabId = `${baseId}-tab-${t.value}`;
          const panelId = `${baseId}-panel-${t.value}`;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              id={tabId}
              aria-controls={panelId}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`tabs__tab${isActive ? ' tabs__tab--active' : ''}`}
              disabled={t.disabled}
              onClick={() => select(t.value)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {activeTab?.panel !== undefined && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeTab.value}`}
          aria-labelledby={`${baseId}-tab-${activeTab.value}`}
          className="tabs__panel"
        >
          {activeTab.panel}
        </div>
      )}
    </div>
  );
}
