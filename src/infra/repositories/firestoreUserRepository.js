// Firestore adapter implementing the UserRepository contract for /users/{uid}.
// The ONLY module (outside lib/firebase.js) that imports from 'firebase/firestore'
// for user profile reads.

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  toUserRole,
  toUserStatus,
  toUserPreferredLocale,
} from '../../domain/repositories/UserRepository';

/** @typedef {import('../../domain/repositories/UserRepository.js').UserProfile} UserProfile */

/**
 * Map a Firestore document snapshot to the narrow UserProfile the UI consumes.
 * Returns null when the doc does not exist.
 *
 * @param {string} uid
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {UserProfile | null}
 */
function toProfile(uid, snap) {
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  const system = data.system || {};
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role: toUserRole(system.role),
    status: toUserStatus(system.status),
    preferredLocale: toUserPreferredLocale(data.preferredLocale),
  };
}

/**
 * Subscribe to the user profile document at /users/{uid}. Returns an
 * unsubscribe function. onChange receives null if the doc is missing;
 * onError fires on Firestore errors (e.g. permission-denied).
 *
 * @param {string} uid
 * @param {(profile: UserProfile | null) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeProfile(uid, onChange, onError) {
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => onChange(toProfile(uid, snap)),
    (err) => onError(err)
  );
}
