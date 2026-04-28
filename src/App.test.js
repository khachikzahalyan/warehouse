// Smoke test: unauthenticated user lands on /login.
// This test mocks the Firebase layer so it never touches the network.

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the infra layer. We don't test Firebase here — we test the wiring.
jest.mock('./infra/repositories/firebaseAuthRepository', () => ({
  onAuthStateChanged: (cb) => {
    // Fire once with "no user" on the next microtask and return an unsubscribe.
    Promise.resolve().then(() => cb(null));
    return () => {};
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('./infra/repositories/firestoreUserRepository', () => ({
  subscribeProfile: () => () => {},
}));

// The dashboard route pulls the Firestore dashboard repo transitively.
// Stub every export so jsdom does not have to load firebase/firestore → undici.
jest.mock('./infra/repositories/firestoreDashboardRepository', () => ({
  countAssets: async () => 0,
  subscribeCount: () => () => {},
  subscribePendingTransfersCount: () => () => {},
  subscribeExpiredLicensesCount: () => () => {},
  subscribeAssetHistory: () => () => {},
  subscribeRecentTransfers: () => () => {},
  subscribeBranchesBasic: () => () => {},
  subscribeAssetBranchIds: () => () => {},
  subscribeUserBranchIds: () => () => {},
}));

// Warehouse route: stub settings and asset repos so Firebase SDK is never loaded.
jest.mock('./infra/repositories/firestoreSettingsRepository', () => ({
  subscribeWarehouseSettings: () => () => {},
  subscribeExchangeRates: () => () => {},
}));
jest.mock('./infra/repositories/firestoreAssetRepository', () => ({
  createAssetRepository: () => ({
    isSkuUnique: async () => ({ unique: true, conflictId: null, conflictName: null }),
    isBarcodeUnique: async () => ({ unique: true, conflictId: null, conflictName: null }),
    isSerialUnique: async () => ({ unique: true, conflictId: null, conflictName: null }),
    create: async () => 'stub-id',
    subscribeStorage: () => () => {},
  }),
}));

import App from './App';

test('unauthenticated session renders login page', async () => {
  render(<App />);
  // Title on the login form. The i18n LanguageDetector reads navigator.language
  // in jsdom, which defaults to en-US, so the English locale wins here.
  expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  // The submit button is present.
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
