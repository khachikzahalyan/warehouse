import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAddDrawer } from './QuickAddDrawer';

// i18next mock — returns fallback string so assertions work without locale files.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback, opts) => {
      const base = typeof fallback === 'string' ? fallback : key;
      if (!opts || typeof base !== 'string') return base;
      return base.replace(/{{(\w+)}}/g, (_, k) => (opts[k] != null ? String(opts[k]) : ''));
    },
    i18n: { changeLanguage: () => {}, language: 'en' },
  }),
}));

// Storage helpers used by useUniqueCheck — silence them in tests.
jest.mock('../../../hooks/useUniqueCheck', () => ({
  useUniqueCheck: () => ({ status: 'idle', conflictName: null, conflictId: null }),
}));

// Settings hook — return a fixed threshold so the form is deterministic.
jest.mock('../../../hooks/useWarehouseSettings', () => ({
  useWarehouseSettings: () => ({
    inventoryCodeThresholdAmd: 50000,
    trackingThresholdUsd: 50000,
    usdToAmd: 390,
    ready: true,
    thresholdError: null,
    rateError: null,
  }),
}));

// Custom-kinds hook — emit just the three hardcoded kinds, no super_admin extras.
jest.mock('../../../hooks/useCustomKinds', () => ({
  useCustomKinds: () => ({
    options: [
      { value: 'device', label: 'Device', custom: false },
      { value: 'furniture', label: 'Furniture', custom: false },
      { value: 'accessory', label: 'Accessory', custom: false },
    ],
    customKinds: [],
    error: null,
  }),
}));

// Default auth mock — non-super_admin so the trailing "+" is hidden.
let mockRole = 'user';
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole, user: { uid: 'u1' } }),
}));

// firestoreSettingsRepository transitively pulls firebase/auth — mock it
// so the test runner doesn't need real Firebase credentials.
jest.mock('../../../infra/repositories/firestoreSettingsRepository', () => ({
  addCustomAssetKind: jest.fn().mockResolvedValue(undefined),
  getCustomAssetKinds: jest.fn().mockResolvedValue([]),
  subscribeCustomAssetKinds: jest.fn(() => () => {}),
  getWarehouseSettings: jest.fn().mockResolvedValue({}),
  subscribeWarehouseSettings: jest.fn(() => () => {}),
  getExchangeRates: jest.fn().mockResolvedValue({ usdToAmd: 390 }),
  subscribeExchangeRates: jest.fn(() => () => {}),
}));

const repoOk = {
  isSkuUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
  isBarcodeUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
  isSerialUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
  create: jest.fn().mockResolvedValue('new-asset-id'),
};

const baseProps = {
  open: true,
  onClose: jest.fn(),
  repo: repoOk,
  categories: [],
  defaultBranchId: null,
  defaultHolderDisplayName: 'Storage',
  existingNames: [],
  onCreated: jest.fn(),
  sourceLanguage: 'en',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'user';
});

test('mounts with three kind tabs (Other dropped) and none preselected', () => {
  render(<QuickAddDrawer {...baseProps} />);
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  expect(screen.getByRole('tab', { name: /^Device$/i })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tab', { name: /^Furniture$/i })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tab', { name: /^Accessory$/i })).toHaveAttribute('aria-selected', 'false');
  expect(screen.queryByRole('tab', { name: /^Other$/i })).not.toBeInTheDocument();
});

test('save button is disabled until a kind is picked', () => {
  render(<QuickAddDrawer {...baseProps} />);
  expect(screen.getByRole('button', { name: /^Save$/i })).toBeDisabled();
});

test('picking a kind reveals the rest of the form', () => {
  render(<QuickAddDrawer {...baseProps} />);
  expect(screen.queryByRole('combobox', { name: /Currency/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^Device$/i }));
  expect(screen.getByRole('tab', { name: /^Device$/i })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('combobox', { name: /Currency/i })).toBeInTheDocument();
});

test('AMD is the default currency once the form expands', () => {
  render(<QuickAddDrawer {...baseProps} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Device$/i }));
  const currencySelect = screen.getByRole('combobox', { name: /Currency/i });
  expect(currencySelect).toHaveValue('AMD');
});

test('accessory hides the hasCode question entirely', () => {
  render(<QuickAddDrawer {...baseProps} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Device$/i }));
  // Device shows hasCode buttons
  expect(screen.getByRole('button', { name: /^Yes$/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /^Accessory$/i }));
  // Accessory hides them
  expect(screen.queryByRole('button', { name: /^Yes$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^No$/i })).not.toBeInTheDocument();
});

test('threshold hint is shown for device/furniture and hidden for accessory', () => {
  render(<QuickAddDrawer {...baseProps} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Device$/i }));
  expect(
    screen.getByText(/Inventory code is required when price exceeds/i),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /^Accessory$/i }));
  expect(
    screen.queryByText(/Inventory code is required when price exceeds/i),
  ).not.toBeInTheDocument();
});

test('cancel button calls onClose', () => {
  const onClose = jest.fn();
  render(<QuickAddDrawer {...baseProps} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
  expect(onClose).toHaveBeenCalled();
});

test('non-super_admin does NOT see the "+" trailing action', () => {
  render(<QuickAddDrawer {...baseProps} />);
  expect(screen.queryByRole('button', { name: /Add a new kind/i })).not.toBeInTheDocument();
});

test('super_admin sees the "+" trailing action after the tabs', () => {
  mockRole = 'super_admin';
  render(<QuickAddDrawer {...baseProps} />);
  expect(screen.getByRole('button', { name: /Add a new kind/i })).toBeInTheDocument();
});
