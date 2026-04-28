import React from 'react';
import { SearchableSelect } from '../../../common/SearchableSelect';

/**
 * SearchableSelect bound to the branches list.
 *
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   branches: Array<{ id: string, name: string }>,
 *   placeholder?: string,
 *   emptyLabel?: string,
 *   id?: string,
 * }} props
 */
export function BranchPicker({ value, onChange, branches, placeholder, emptyLabel, id }) {
  const options = (branches ?? []).map((b) => ({ value: b.id, label: b.name }));
  return (
    <SearchableSelect
      id={id}
      options={options}
      value={value || null}
      onChange={onChange}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
    />
  );
}
