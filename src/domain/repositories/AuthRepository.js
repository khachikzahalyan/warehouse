// AuthRepository — domain contract for authentication.
// Implemented by src/infra/repositories/firebaseAuthRepository.js.

/**
 * Minimal identity surface the UI needs. Matches the subset of Firebase Auth's
 * User we actually consume — do not widen without a reason.
 *
 * @typedef {Object} AuthUser
 * @property {string} uid
 * @property {string | null} email
 * @property {string | null} displayName
 */

/**
 * @typedef {Object} AuthRepository
 * @property {(email: string, password: string) => Promise<void>} signIn
 * @property {() => Promise<void>} signOut
 * @property {(onChange: (user: AuthUser | null) => void) => () => void} onAuthStateChanged
 *   Subscribes to auth state. Returns an unsubscribe function.
 */

export {};
