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

import App from './App';

test('unauthenticated session renders login page', async () => {
  render(<App />);
  // Title on the login form.
  expect(await screen.findByText('Вход в систему')).toBeInTheDocument();
  // The submit button is present.
  expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
});
