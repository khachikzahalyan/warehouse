import { render, screen, fireEvent } from '@testing-library/react';
import { WarehouseTable } from './WarehouseTable';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Type' },
  { key: 'sku', label: 'Code' },
  { key: 'quantity', label: 'Qty' },
];

const ASSET = {
  id: 'a-1',
  name: 'Dell Latitude',
  sku: 'INV-100',
  category: 'laptop',
  quantity: 1,
  branchId: 'b-1',
};

const LABELS = {
  details: 'Details',
  edit: 'Edit',
  delete: 'Delete',
  transfer: 'Transfer',
};

function renderTable(overrides = {}) {
  const props = {
    assets: [ASSET],
    columns: COLUMNS,
    actionLabels: LABELS,
    onDetails: jest.fn(),
    onEdit: jest.fn(),
    onTransfer: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
  render(<WarehouseTable {...props} />);
  return props;
}

test('renders four icon-only action buttons with correct aria-labels', () => {
  renderTable();
  expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Transfer' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
});

test('each action button forwards the row asset to its callback', () => {
  const props = renderTable();
  fireEvent.click(screen.getByRole('button', { name: 'Details' }));
  expect(props.onDetails).toHaveBeenCalledWith(ASSET);

  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  expect(props.onEdit).toHaveBeenCalledWith(ASSET);

  fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
  expect(props.onTransfer).toHaveBeenCalledWith(ASSET);

  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(props.onDelete).toHaveBeenCalledWith(ASSET);
});

test('omits action buttons whose callback is undefined', () => {
  renderTable({ onEdit: undefined, onDelete: undefined, onTransfer: undefined });
  expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Transfer' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
});

test('every action button renders an inline svg icon', () => {
  renderTable();
  for (const name of ['Details', 'Edit', 'Transfer', 'Delete']) {
    const btn = screen.getByRole('button', { name });
    expect(btn.querySelector('svg')).not.toBeNull();
  }
});

test('variant modifiers map to the correct buttons', () => {
  renderTable();
  const details = screen.getByRole('button', { name: 'Details' });
  const edit = screen.getByRole('button', { name: 'Edit' });
  const transfer = screen.getByRole('button', { name: 'Transfer' });
  const del = screen.getByRole('button', { name: 'Delete' });

  // All four use the icon geometry.
  for (const btn of [details, edit, transfer, del]) {
    expect(btn).toHaveClass('warehouse-table__action--icon');
  }
  // Only Transfer is primary.
  expect(transfer).toHaveClass('warehouse-table__action--primary');
  expect(details).not.toHaveClass('warehouse-table__action--primary');
  expect(edit).not.toHaveClass('warehouse-table__action--primary');
  expect(del).not.toHaveClass('warehouse-table__action--primary');
  // Only Delete is danger.
  expect(del).toHaveClass('warehouse-table__action--danger');
  expect(details).not.toHaveClass('warehouse-table__action--danger');
  expect(edit).not.toHaveClass('warehouse-table__action--danger');
  expect(transfer).not.toHaveClass('warehouse-table__action--danger');
});

test('action buttons appear in document order Details → Edit → Transfer → Delete', () => {
  renderTable();
  const buttons = screen.getAllByRole('button');
  const labels = buttons.map((b) => b.getAttribute('aria-label'));
  // The first four buttons in the DOM are the row actions.
  expect(labels.slice(0, 4)).toEqual(['Details', 'Edit', 'Transfer', 'Delete']);
});

test('icon buttons have type="button" so they do not submit a parent form', () => {
  renderTable();
  for (const name of ['Details', 'Edit', 'Transfer', 'Delete']) {
    const btn = screen.getByRole('button', { name });
    expect(btn.getAttribute('type')).toBe('button');
  }
});

test('falls back to default English labels when actionLabels prop is omitted', () => {
  render(
    <WarehouseTable
      assets={[ASSET]}
      columns={COLUMNS}
      onDetails={jest.fn()}
      onEdit={jest.fn()}
      onTransfer={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  // Defaults defined in the component.
  expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Transfer' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
});
