import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../common/Table';
import { Icon } from '../../icons';
import './WarehouseTable.css';

/**
 * Tabular listing of storage assets.
 *
 * @param {{
 *   assets: Array<{ id: string, name: string, sku: string, category: string, quantity: number, branchId: string }>,
 *   columns: Array<{ key: string, label: string }>,
 *   onDetails?: (asset: object) => void,
 *   onEdit?: (asset: object) => void,
 *   onDelete?: (asset: object) => void,
 *   onTransfer?: (asset: object) => void,
 *   actionLabels?: { details: string, edit: string, delete: string, transfer: string },
 * }} props
 */
export function WarehouseTable({
  assets,
  columns,
  onDetails,
  onEdit,
  onDelete,
  onTransfer,
  actionLabels,
}) {
  const labels = actionLabels || {
    details: 'Details',
    edit: 'Edit',
    delete: 'Delete',
    transfer: 'Transfer',
  };
  const showActions = Boolean(onDetails || onEdit || onDelete || onTransfer);

  return (
    <Table>
      <Thead>
        <Tr>
          {columns.map((col) => (
            <Th key={col.key}>{col.label}</Th>
          ))}
          {showActions && (
            <Th className="warehouse-table__actions-th" aria-label={labels.details} />
          )}
        </Tr>
      </Thead>
      <Tbody>
        {assets.map((asset) => (
          <Tr key={asset.id}>
            {columns.map((col) => {
              let display;
              if (col.key === 'name') {
                display = asset.name || '—';
              } else if (col.key === 'quantity' && asset.sku) {
                // Coded items are tracked one-by-one — quantity is meaningless.
                display = '—';
              } else {
                const v = asset[col.key];
                display = v === null || v === undefined || v === '' ? '—' : v;
              }
              return <Td key={col.key}>{display}</Td>;
            })}
            {showActions && (
              <Td className="warehouse-table__actions-cell">
                <div className="warehouse-table__actions">
                  {onDetails && (
                    <button
                      type="button"
                      className="warehouse-table__action warehouse-table__action--icon"
                      onClick={() => onDetails(asset)}
                      aria-label={labels.details}
                      title={labels.details}
                    >
                      <Icon name="eye" size={18} />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      type="button"
                      className="warehouse-table__action warehouse-table__action--icon"
                      onClick={() => onEdit(asset)}
                      aria-label={labels.edit}
                      title={labels.edit}
                    >
                      <Icon name="pencil" size={18} />
                    </button>
                  )}
                  {onTransfer && (
                    <button
                      type="button"
                      className="warehouse-table__action warehouse-table__action--icon warehouse-table__action--primary"
                      onClick={() => onTransfer(asset)}
                      aria-label={labels.transfer}
                      title={labels.transfer}
                    >
                      <Icon name="arrowRight" size={18} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="warehouse-table__action warehouse-table__action--icon warehouse-table__action--danger"
                      onClick={() => onDelete(asset)}
                      aria-label={labels.delete}
                      title={labels.delete}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  )}
                </div>
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
