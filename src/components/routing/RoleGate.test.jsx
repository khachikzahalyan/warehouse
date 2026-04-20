// RoleGate behaviour: renders children only when the current profile's role
// is in the allowed list. Silently hides the branch (does not redirect)
// when the role does not match.
//
// We mock the Firebase-backed repositories that AuthContext transitively
// imports so jsdom never has to load firebase/auth (undici requires
// ReadableStream which jsdom does not provide).

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
import { AuthContext } from '../../contexts/AuthContext';
import { RoleGate } from './RoleGate';

function renderWithProfile(role, ui) {
  const value = {
    user: { uid: 'u1', email: 'a@b.c' },
    profile: {
      uid: 'u1',
      email: 'a@b.c',
      displayName: 'A',
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
  return render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>);
}

describe('RoleGate', () => {
  test('renders children when role matches the allowed list', () => {
    renderWithProfile(
      'super_admin',
      <RoleGate roles={['super_admin']}>
        <span>secret</span>
      </RoleGate>
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  test('hides children when role is not in the allowed list', () => {
    renderWithProfile(
      'user',
      <RoleGate roles={['admin', 'super_admin']}>
        <span>secret</span>
      </RoleGate>
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  test('renders the fallback when role does not match', () => {
    renderWithProfile(
      'user',
      <RoleGate roles={['super_admin']} fallback={<span>locked</span>}>
        <span>secret</span>
      </RoleGate>
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByText('locked')).toBeInTheDocument();
  });

  test('accepts the singular `role` prop', () => {
    renderWithProfile(
      'admin',
      <RoleGate role="admin">
        <span>visible</span>
      </RoleGate>
    );
    expect(screen.getByText('visible')).toBeInTheDocument();
  });

  test('hides children when there is no profile', () => {
    const value = {
      user: null,
      profile: null,
      role: null,
      loading: false,
      authLoading: false,
      profileLoading: false,
      error: null,
      signIn: async () => {},
      signOut: async () => {},
    };
    render(
      <AuthContext.Provider value={value}>
        <RoleGate role="super_admin">
          <span>secret</span>
        </RoleGate>
      </AuthContext.Provider>
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});
