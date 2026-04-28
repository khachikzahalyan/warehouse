import React from 'react';
import { SearchableSelect } from '../../../common/SearchableSelect';

/**
 * SearchableSelect bound to a categories list from /settings/global_lists.
 * When categories is empty or undefined, the input is disabled and the wrapper
 * shows a `title` tooltip explaining why.
 *
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   categories: Array<{ id: string, label: string }>,
 *   placeholder?: string,
 *   emptyLabel?: string,
 *   disabledTooltip?: string,
 *   id?: string,
 * }} props
 */
export function CategoryPicker({
  value,
  onChange,
  categories,
  placeholder,
  emptyLabel,
  disabledTooltip,
  id,
}) {
  const isEmpty = !categories || categories.length === 0;
  const options = (categories ?? []).map((c) => ({ value: c.id, label: c.label }));
  return (
    <div title={isEmpty ? disabledTooltip : undefined}>
      <SearchableSelect
        id={id}
        options={options}
        value={value || null}
        onChange={onChange}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        disabled={isEmpty}
      />
    </div>
  );
}
