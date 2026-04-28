import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditAssetDrawer } from './EditAssetDrawer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
}));

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

const repo = { update: jest.fn().mockResolvedValue(undefined) };

const baseAsset = {
  id: 'a1',
  name: 'Lenovo ThinkPad',
  kind: 'device',
  category: 'laptop',
  model: 'X1 Carbon',
  quantity: 1,
  condition: 'new',
  warrantyStart: null,
  warrantyEnd: null,
  sku: 'INV-001',
};

beforeEach(() => jest.clearAllMocks());

test('the kind segmented control is disabled (immutable on edit)', () => {
  render(<EditAssetDrawer open onClose={() => {}} asset={baseAsset} repo={repo} categories={[]} />);
  const tabs = screen.getAllByRole('tab');
  for (const tab of tabs) {
    expect(tab).toBeDisabled();
  }
});

test('clicking another kind tab does NOT change the active selection', () => {
  render(<EditAssetDrawer open onClose={() => {}} asset={baseAsset} repo={repo} categories={[]} />);
  const furniture = screen.getByRole('tab', { name: /^Furniture$/i });
  fireEvent.click(furniture);
  // Device remains selected — the click was a no-op because the control is disabled.
  expect(screen.getByRole('tab', { name: /^Device$/i })).toHaveAttribute('aria-selected', 'true');
  expect(furniture).toHaveAttribute('aria-selected', 'false');
});

test('renders the "kind cannot be changed" hint underneath the segmented control', () => {
  render(<EditAssetDrawer open onClose={() => {}} asset={baseAsset} repo={repo} categories={[]} />);
  expect(screen.getByText(/Kind cannot be changed after creation/i)).toBeInTheDocument();
});

test('legacy `other` kind is still represented in the segmented control', () => {
  const legacy = { ...baseAsset, kind: 'other', category: 'other_misc' };
  render(<EditAssetDrawer open onClose={() => {}} asset={legacy} repo={repo} categories={[]} />);
  const tab = screen.getByRole('tab', { name: /^other$/i });
  expect(tab).toHaveAttribute('aria-selected', 'true');
  expect(tab).toBeDisabled();
});
