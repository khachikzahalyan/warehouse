import React from 'react';
import { Button } from '../../common/Button';

/**
 * The primary "Add asset" button in the page header.
 * Renders nothing when the user does not have staff rights.
 *
 * @param {{ canAdd: boolean, onClick: () => void, label: string }} props
 */
export function WarehouseAddButton({ canAdd, onClick, label }) {
  if (!canAdd) return null;
  return (
    <Button variant="primary" type="button" onClick={onClick}>
      {label}
    </Button>
  );
}
