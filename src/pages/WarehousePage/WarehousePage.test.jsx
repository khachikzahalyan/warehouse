import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WarehousePage } from './WarehousePage';

// ---- Dependency mocks ----

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { changeLanguage: () => {} },
  }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../hooks/useWarehouseSettings', () => ({
  useWarehouseSettings: () => ({
    trackingThresholdUsd: 50000,
    inventoryCodeThresholdAmd: 50000,
    usdToAmd: 390,
    ready: true,
    thresholdError: null,
    rateError: null,
  }),
}));
jest.mock('../../hooks/useStorageAssets', () => ({
  useStorageAssets: jest.fn(),
}));
jest.mock('../../hooks/useBranches', () => ({
  useBranches: () => ({ branches: [{ id: 'br-1', name: 'Main' }], loading: false, error: null }),
}));
jest.mock('../../infra/repositories/firestoreAssetRepository', () => ({
  createAssetRepository: () => ({
    isSkuUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
    isBarcodeUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
    isSerialUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
    create: jest.fn().mockResolvedValue('new-id'),
    subscribeStorage: jest.fn(() => () => {}),
  }),
}));
// firestoreSettingsRepository transitively pulls firebase/auth — mock it.
jest.mock('../../infra/repositories/firestoreSettingsRepository', () => ({
  addCustomAssetKind: jest.fn().mockResolvedValue(undefined),
  getCustomAssetKinds: jest.fn().mockResolvedValue([]),
  subscribeCustomAssetKinds: jest.fn(() => () => {}),
  getWarehouseSettings: jest.fn().mockResolvedValue({}),
  subscribeWarehouseSettings: jest.fn(() => () => {}),
  getExchangeRates: jest.fn().mockResolvedValue({ usdToAmd: 390 }),
  subscribeExchangeRates: jest.fn(() => () => {}),
}));
// useCustomKinds — return three hardcoded kinds.
jest.mock('../../hooks/useCustomKinds', () => ({
  useCustomKinds: () => ({
    options: [
      { value: 'device', label: 'device', custom: false },
      { value: 'furniture', label: 'furniture', custom: false },
      { value: 'accessory', label: 'accessory', custom: false },
    ],
    customKinds: [],
    error: null,
  }),
}));

const { useAuth } = require('../../hooks/useAuth');
const { useStorageAssets } = require('../../hooks/useStorageAssets');

function renderPage() {
  return render(
    <MemoryRouter>
      <WarehousePage />
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

test('empty state is shown for staff when no assets', () => {
  useAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Admin' }, role: 'admin' });
  useStorageAssets.mockReturnValue({ assets: [], loading: false, error: null });
  renderPage();
  expect(screen.getByText(/warehouse is empty/i)).toBeInTheDocument();
});

test('add button is visible for staff', () => {
  useAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Admin' }, role: 'admin' });
  useStorageAssets.mockReturnValue({ assets: [], loading: false, error: null });
  renderPage();
  expect(screen.getByRole('button', { name: /add asset/i })).toBeInTheDocument();
});

test('add button is NOT visible for non-staff user role', () => {
  useAuth.mockReturnValue({ user: { uid: 'u2', displayName: 'Alice' }, role: 'user' });
  useStorageAssets.mockReturnValue({ assets: [], loading: false, error: null });
  renderPage();
  expect(screen.queryByRole('button', { name: /add asset/i })).not.toBeInTheDocument();
});

test('table is shown when assets exist', () => {
  useAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Admin' }, role: 'admin' });
  useStorageAssets.mockReturnValue({
    assets: [{ id: 'a1', name: 'Laptop', sku: 'SKU-1', kind: 'device', category: 'laptop', quantity: 1, branchId: 'br-1' }],
    loading: false,
    error: null,
  });
  renderPage();
  expect(screen.getByText('Laptop')).toBeInTheDocument();
  expect(screen.queryByText(/warehouse is empty/i)).not.toBeInTheDocument();
});

test('hotkey N opens drawer for staff', () => {
  useAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Admin' }, role: 'admin' });
  useStorageAssets.mockReturnValue({ assets: [], loading: false, error: null });
  renderPage();
  fireEvent.keyDown(window, { key: 'N' });
  // Drawer dialog should be open
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('hotkey N does NOT open drawer for non-staff', () => {
  useAuth.mockReturnValue({ user: { uid: 'u2', displayName: 'Alice' }, role: 'user' });
  useStorageAssets.mockReturnValue({ assets: [], loading: false, error: null });
  renderPage();
  fireEvent.keyDown(window, { key: 'N' });
  // Drawer should not open — no dialog role
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('kind filter chips narrow the table to the selected kind', () => {
  useAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Admin' }, role: 'admin' });
  useStorageAssets.mockReturnValue({
    assets: [
      { id: 'a1', name: 'MacBook', kind: 'device', category: 'laptop', quantity: 1 },
      { id: 'a2', name: 'Desk', kind: 'furniture', category: 'desk', quantity: 1 },
      { id: 'a3', name: 'Mouse', kind: 'accessory', category: 'mouse', quantity: 5 },
    ],
    loading: false,
    error: null,
  });
  renderPage();
  // All three rows initially
  expect(screen.getByText('MacBook')).toBeInTheDocument();
  expect(screen.getByText('Desk')).toBeInTheDocument();
  expect(screen.getByText('Mouse')).toBeInTheDocument();

  // Click "Furniture" chip — i18n mock falls back to the raw kind id, so
  // the accessible name reads "furniture 1" (label + count badge).
  fireEvent.click(screen.getByRole('tab', { name: /furniture/i }));
  expect(screen.queryByText('MacBook')).not.toBeInTheDocument();
  expect(screen.getByText('Desk')).toBeInTheDocument();
  expect(screen.queryByText('Mouse')).not.toBeInTheDocument();

  // Click "All" to reset
  fireEvent.click(screen.getByRole('tab', { name: /^All/ }));
  expect(screen.getByText('MacBook')).toBeInTheDocument();
});

test('legacy assets without kind fall back via category mapping (peripheral → accessory)', () => {
  useAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'Admin' }, role: 'admin' });
  useStorageAssets.mockReturnValue({
    assets: [
      { id: 'a1', name: 'Old keyboard', category: 'peripheral', quantity: 1 },
    ],
    loading: false,
    error: null,
  });
  renderPage();
  fireEvent.click(screen.getByRole('tab', { name: /accessory/i }));
  expect(screen.getByText('Old keyboard')).toBeInTheDocument();
});
