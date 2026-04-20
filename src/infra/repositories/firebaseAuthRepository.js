// Firebase Auth adapter implementing the AuthRepository contract.
// This is the ONLY module that imports from 'firebase/auth' (outside lib/firebase.js).

import {
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';

/** @typedef {import('../../domain/repositories/AuthRepository.js').AuthUser} AuthUser */

/**
 * @param {import('firebase/auth').User | null} user
 * @returns {AuthUser | null}
 */
function toAuthUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<void>}
 */
export async function signIn(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

/** @returns {Promise<void>} */
export async function signOut() {
  await fbSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 * @param {(user: AuthUser | null) => void} onChange
 * @returns {() => void} unsubscribe
 */
export function onAuthStateChanged(onChange) {
  return fbOnAuthStateChanged(auth, (user) => onChange(toAuthUser(user)));
}
