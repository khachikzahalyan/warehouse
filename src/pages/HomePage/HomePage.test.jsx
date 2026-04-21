// HomePage smoke tests: the tile grid must respect role-based visibility.
// Uses the real i18n instance so translation keys are resolved, which is the
// same environment the browser runs.
//
// AuthContext transitively imports firebase/auth (via our infra repos);
// undici inside firebase/auth needs ReadableStream which jsdom lacks. Mock
// the repositories so we never load the SDK in tests.

jest.mock('../../infra/repositories/firebaseAuthRepository', () => ({
  onAuthStateChanged: () => () => {},
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('../../infra/repositories/firestoreUserRepository', () => ({
  subscribeProfile: () => () => {},
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';

// Initialize the shared i18next instance before we import the page so the
// translations are registered.
import i18n from '../../i18n';
import { AuthContext } from '../../contexts/AuthContext';
import { HomePage } from './HomePage';

function renderAsRole(role) {
  const value = {
    user: { uid: 'u1', email: 'admin@example.com' },
    profile: {
      uid: 'u1',
      email: 'admin@example.com',
      displayName: 'Admin',
      role,
      status: 'active',
      preferredLocale: 'hy',
    },
    role,
    loading: false,
    authLoading: false,
    profileLoading: false,
    error: null,
    signIn: async () => {},
    signOut: async () => {},
  };

  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <HomePage />
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

describe('HomePage tiles', () => {
  test('super_admin sees every nav tile, including Dashboard / Employees / Settings', () => {
    renderAsRole('super_admin');
    // The six tiles from NAV_ITEMS must all appear for a super_admin.
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Branches')).toBeInTheDocument();
    expect(screen.getByText('Licenses')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Removed/renamed entries must not linger.
    expect(screen.queryByText('Inventory')).not.toBeInTheDocument();
    expect(screen.queryByText('Transfers')).not.toBeInTheDocument();
    expect(screen.queryByText('Structure')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  test('admin sees Warehouse / Employees / Branches / Licenses, but no Dashboard / Settings', () => {
    renderAsRole('admin');
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();

    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Branches')).toBeInTheDocument();
    expect(screen.getByText('Licenses')).toBeInTheDocument();
  });

  test('plain user sees only tiles with no role restriction', () => {
    renderAsRole('user');
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Employees')).not.toBeInTheDocument();
    expect(screen.queryByText('Branches')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();

    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Licenses')).toBeInTheDocument();
  });
});
