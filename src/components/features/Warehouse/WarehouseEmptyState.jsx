import React from 'react';
import { EmptyState } from '../../common/EmptyState';
import { Button } from '../../common/Button';

/**
 * Full-page empty state for the Warehouse when no assets are stored.
 *
 * @param {{
 *   canAdd: boolean,
 *   onAdd: () => void,
 *   title: string,
 *   description?: string,
 *   addLabel: string,
 * }} props
 */
export function WarehouseEmptyState({ canAdd, onAdd, title, description, addLabel }) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        canAdd ? (
          <Button variant="primary" type="button" onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null
      }
    />
  );
}
