// Global auth state: Firebase Auth user + the matching Firestore user profile.
// Loading lifecycle:
//   authLoading   — true until onAuthStateChanged fires for the first time
//   profileLoading — true when we have a user but the /users/{uid} snapshot
//                    has not yet arrived
//   loading       — union: true while either is still resolving
//
// Consumers should read `loading` for gating navigation and the concrete
// flags only when they need finer granularity.

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChanged,
} from '../infra/repositories/firebaseAuthRepository';
import { subscribeProfile } from '../infra/repositories/firestoreUserRepository';

/** @typedef {import('../domain/repositories/AuthRepository.js').AuthUser} AuthUser */
/** @typedef {import('../domain/repositories/UserRepository.js').UserProfile} UserProfile */
/** @typedef {import('../domain/repositories/UserRepository.js').UserRole} UserRole */

/**
 * @typedef {Object} AuthContextValue
 * @property {AuthUser | null} user
 * @property {UserProfile | null} profile
 * @property {UserRole | null} role
 * @property {boolean} loading
 * @property {boolean} authLoading
 * @property {boolean} profileLoading
 * @property {Error | null} error
 * @property {(email: string, password: string) => Promise<void>} signIn
 * @property {() => Promise<void>} signOut
 */

/** @type {React.Context<AuthContextValue>} */
export const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  loading: true,
  authLoading: true,
  profileLoading: false,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(/** @type {AuthUser | null} */ (null));
  const [profile, setProfile] = useState(/** @type {UserProfile | null} */ (null));
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  // Keep the profile subscription's unsubscribe in a ref so auth state changes
  // can tear down the previous subscription cleanly.
  const profileUnsubRef = useRef(/** @type {null | (() => void)} */ (null));

  useEffect(() => {
    const unsub = onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      setError(null);

      // Tear down any previous profile subscription.
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfile(null);
      profileUnsubRef.current = subscribeProfile(
        nextUser.uid,
        (next) => {
          setProfile(next);
          setProfileLoading(false);
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.error('[auth] profile subscription error:', err);
          setError(err);
          setProfile(null);
          setProfileLoading(false);
        }
      );
    });

    return () => {
      unsub();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    await authSignIn(email, password);
    // AuthContext state updates via onAuthStateChanged — no direct setUser here.
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await authSignOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile ? profile.role : null,
      loading: authLoading || profileLoading,
      authLoading,
      profileLoading,
      error,
      signIn,
      signOut,
    }),
    [user, profile, authLoading, profileLoading, error, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
