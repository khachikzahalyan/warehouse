// UserRepository — domain contract for reading user profiles from the
// persistence layer. Implemented by src/infra/repositories/firestoreUserRepository.js.
//
// The app-wide role enum lives here. It MUST stay in sync with firestore.rules
// at the repo root (rules use the same string values at users/{uid}.system.role).

import { toAppLocale } from '../locales';

/** @typedef {import('../locales').AppLocale} AppLocale */

/**
 * @typedef {'user' | 'admin' | 'super_admin'} UserRole
 */

/**
 * Account status. Lifecycle:
 *   - `active`    : can sign in, owns assets normally.
 *   - `blocking`  : being offboarded — a ReturnChecklist is open against the user.
 *                   Sign-in is denied; record is preserved for audit.
 *   - `blocked`   : offboarded. ReturnChecklist closed. Sign-in denied.
 *   - `archived`  : historical record, not expected to return. Sign-in denied.
 *   - `disabled`  : legacy value kept for backward compatibility with existing
 *                   Firestore documents. Treated as sign-in-denied.
 *
 * Only `active` may sign in. Everything else is treated as blocked by UI/auth
 * code; transitioning away from `active` is performed by admins, never by the
 * user themselves.
 *
 * @typedef {'active' | 'blocking' | 'blocked' | 'archived' | 'disabled'} UserStatus
 */

/**
 * Shape exposed to the React layer. This is the *narrow* view — the raw
 * Firestore document may carry additional fields; the infra adapter strips
 * them to this shape so consumers don't couple to storage.
 *
 * @typedef {Object} UserProfile
 * @property {string} uid
 * @property {string} email
 * @property {string} displayName
 * @property {UserRole} role
 * @property {UserStatus} status
 * @property {AppLocale} preferredLocale   UI locale the user last picked; default 'hy'.
 */

/** All valid roles, in ascending privilege order. */
export const USER_ROLES = Object.freeze(['user', 'admin', 'super_admin']);

/** All valid statuses, ordered roughly by severity (active → archived). */
export const USER_STATUSES = Object.freeze([
  'active',
  'blocking',
  'blocked',
  'archived',
  'disabled',
]);

/**
 * Narrow an unknown value to a UserRole. Unknown → 'user' (least privilege).
 * @param {unknown} value
 * @returns {UserRole}
 */
export function toUserRole(value) {
  return USER_ROLES.includes(/** @type {UserRole} */ (value))
    ? /** @type {UserRole} */ (value)
    : 'user';
}

/**
 * Narrow an unknown value to a UserStatus. Unknown → 'blocked' (safe lockout
 * default — unknown input must never grant sign-in).
 * @param {unknown} value
 * @returns {UserStatus}
 */
export function toUserStatus(value) {
  return USER_STATUSES.includes(/** @type {UserStatus} */ (value))
    ? /** @type {UserStatus} */ (value)
    : 'blocked';
}

/**
 * Re-export for consumers that only import from UserRepository — avoids
 * a second import of ../locales in simple call sites. Always delegates
 * to the canonical narrower in src/domain/locales.js.
 * @param {unknown} value
 * @returns {AppLocale}
 */
export function toUserPreferredLocale(value) {
  return toAppLocale(value);
}

/**
 * Repository contract — infra adapters implement this shape.
 *
 * @typedef {Object} UserRepository
 * @property {(uid: string, onChange: (profile: UserProfile | null) => void, onError: (err: Error) => void) => () => void} subscribeProfile
 *   Subscribe to live updates of /users/{uid}. Returns an unsubscribe function.
 *   Calls onChange(null) when the document does not exist.
 */

export {};
