import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './SearchableSelect.css';

/**
 * Combobox that filters a flat option list by substring.
 *
 * When `allowFreeText` is true, the input accepts any typed string (not just
 * options): every keystroke fires `onChange(value)` with the raw text, and
 * the displayed value follows `value` directly. Picking an option still
 * commits `onChange(option.value)`.
 *
 * @typedef {{ value: string, label: string }} SSOption
 *
 * @param {{
 *   options: SSOption[],
 *   value: string | null,
 *   onChange: (value: string) => void,
 *   placeholder?: string,
 *   emptyLabel?: string,
 *   disabled?: boolean,
 *   id?: string,
 *   name?: string,
 *   ariaLabel?: string,
 *   className?: string,
 *   allowFreeText?: boolean,
 * }} props
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '',
  emptyLabel = 'No results',
  disabled = false,
  id,
  name,
  ariaLabel,
  className = '',
  allowFreeText = false,
}) {
  const reactId = useId();
  const inputId = id || `ss-${reactId}`;
  const listId = `${inputId}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  // Sync input text when dropdown is closed.
  // - allowFreeText: input always reflects `value` directly.
  // - select-only: input reflects the selected option's label.
  useEffect(() => {
    if (!open) {
      if (allowFreeText) {
        setQuery(value ?? '');
      } else {
        setQuery(selected?.label ?? '');
      }
      setActiveIndex(-1);
    }
  }, [selected, open, allowFreeText, value]);

  // Close on outside click.
  useEffect(() => {
    function handleMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  function handleInputChange(e) {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    setActiveIndex(-1);
    if (allowFreeText) {
      onChange(next);
    }
  }

  function handleFocus() {
    if (!disabled) setOpen(true);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        const opt = filtered[activeIndex];
        onChange(opt.value);
        setOpen(false);
        setQuery(opt.label);
      } else if (allowFreeText) {
        // Keep typed text as-is.
        setOpen(false);
      }
    }
  }

  const activeOptId = activeIndex >= 0 && filtered[activeIndex]
    ? `${listId}-opt-${activeIndex}`
    : undefined;

  const inputValue = open
    ? query
    : (allowFreeText ? (value ?? '') : (selected?.label ?? ''));

  return (
    <div
      ref={wrapRef}
      className={['searchable-select', disabled ? 'searchable-select--disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        id={inputId}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeOptId}
        aria-label={ariaLabel}
        className="searchable-select__input"
        placeholder={placeholder}
        disabled={disabled}
        value={inputValue}
        onFocus={handleFocus}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && !disabled && (
        <ul id={listId} role="listbox" className="searchable-select__list">
          {filtered.length === 0 ? (
            <li className="searchable-select__empty" aria-live="polite">
              {emptyLabel}
            </li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt.value}
                id={`${listId}-opt-${idx}`}
                role="option"
                aria-selected={opt.value === value}
                className={[
                  'searchable-select__option',
                  idx === activeIndex ? 'searchable-select__option--active' : '',
                  opt.value === value ? 'searchable-select__option--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                  setQuery(opt.label);
                }}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
