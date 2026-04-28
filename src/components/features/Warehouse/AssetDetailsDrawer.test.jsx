import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssetDetailsDrawer } from './AssetDetailsDrawer';

let mockLanguage = 'ru';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: mockLanguage },
  }),
}));

const baseAsset = {
  id: 'a1',
  name: 'Lenovo ThinkPad',
  sku: 'INV-001',
  model: 'X1 Carbon',
  quantity: 1,
  condition: 'new',
  category: 'laptop',
  branchId: 'main',
  holderId: 'storage',
  holderType: 'storage',
  holder: { displayName: 'Storage', type: 'storage', id: 'storage' },
  warrantyStart: new Date(2026, 3, 28),
  warrantyEnd: new Date(2027, 3, 28),
  createdAt: new Date(2026, 0, 15),
  supplier: 'ACME',
  invoiceNumber: 'INV-77',
};

beforeEach(() => {
  mockLanguage = 'ru';
});

test('does NOT render a "Holder type" row', () => {
  render(<AssetDetailsDrawer open onClose={() => {}} asset={baseAsset} />);
  // Only "Holder" should appear, not "Holder type".
  expect(screen.queryByText(/Holder type/i)).not.toBeInTheDocument();
  expect(screen.getByText(/^Holder$/i)).toBeInTheDocument();
});

test('renders ONE warranty row containing the formatted range', () => {
  render(<AssetDetailsDrawer open onClose={() => {}} asset={baseAsset} />);
  // No separate "start" / "end" rows — there must be a single "Warranty" row.
  expect(screen.queryByText(/Warranty start/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Warranty end/i)).not.toBeInTheDocument();
  // The merged range value, ru locale → DD.MM.YYYY.
  expect(screen.getByText('28.04.2026 — 28.04.2027')).toBeInTheDocument();
});

test('formats Added date in ru locale as DD.MM.YYYY', () => {
  render(<AssetDetailsDrawer open onClose={() => {}} asset={baseAsset} />);
  expect(screen.getByText('15.01.2026')).toBeInTheDocument();
});

test('formats dates in en locale as MM/DD/YYYY', () => {
  mockLanguage = 'en';
  render(<AssetDetailsDrawer open onClose={() => {}} asset={baseAsset} />);
  expect(screen.getByText('04/28/2026 — 04/28/2027')).toBeInTheDocument();
});

test('warranty row collapses to one side when only start is set', () => {
  const oneSided = { ...baseAsset, warrantyEnd: null };
  render(<AssetDetailsDrawer open onClose={() => {}} asset={oneSided} />);
  expect(screen.getByText('28.04.2026')).toBeInTheDocument();
  expect(screen.queryByText(/—/)).not.toBeInTheDocument();
});

test('warranty row is omitted when both start and end are null', () => {
  const noWarranty = { ...baseAsset, warrantyStart: null, warrantyEnd: null };
  render(<AssetDetailsDrawer open onClose={() => {}} asset={noWarranty} />);
  // The localized label "Warranty" should not appear at all in this case.
  expect(screen.queryByText(/^Warranty$/i)).not.toBeInTheDocument();
});
