// ReturnChecklistRepository — domain contract for the offboarding checklist.
// Implemented by `src/infra/repositories/firestoreReturnChecklistRepository.js`
// in a later step (Firestore writes + matching `firestore.rules` entry are NOT
// part of Step 1).
//
// Components and hooks depend on this shape only; they never import
// `firebase/firestore` directly.

/** @typedef {import('../entities/ReturnChecklist').ReturnChecklist} ReturnChecklist */
/** @typedef {import('../entities/ReturnChecklist').ReturnChecklistCreateInput} ReturnChecklistCreateInput */
/** @typedef {import('../entities/ReturnChecklist').ReturnChecklistItemPatch} ReturnChecklistItemPatch */

/**
 * @typedef {Object} ReturnChecklistRepository
 *
 * @property {(input: ReturnChecklistCreateInput) => Promise<string>} create
 *   Open a checklist. Returns the new doc id. The implementation MUST:
 *     1. set status='open', createdAt=serverTimestamp
 *     2. populate items[] from the provided assetIds with returned=false,
 *        note=input.items[i].note ?? '', returnedAt=null, confirmedBy=null
 *     3. flip the target user's status to 'blocking' in the same batched
 *        write so the UI never observes an orphaned checklist.
 *
 * @property {(id: string, onChange: (checklist: ReturnChecklist | null) => void, onError: (err: Error) => void) => () => void} subscribe
 *   Live subscription to a single checklist doc. Calls onChange(null) when
 *   the document does not exist. Returns an unsubscribe function.
 *
 * @property {(id: string) => Promise<ReturnChecklist | null>} get
 *   One-shot read. Returns null when the document does not exist.
 *
 * @property {(userId: string, onChange: (checklists: ReturnChecklist[]) => void, onError: (err: Error) => void) => () => void} listForUser
 *   Live subscription to every checklist belonging to a user, ordered by
 *   createdAt desc. In practice a user has at most one open checklist at a
 *   time, but historical closed checklists remain readable for audit.
 *
 * @property {(id: string, patch: ReturnChecklistItemPatch) => Promise<void>} update
 *   Apply one item-level patch (toggle returned / set note). Implementation
 *   writes returnedAt=serverTimestamp and confirmedBy=patch.confirmedBy on
 *   the targeted item.
 *
 * @property {(id: string, closedBy: string) => Promise<void>} close
 *   Transition status 'open' → 'closed', set closedAt=serverTimestamp and
 *   closedBy=closedBy. MUST also flip the user's status from 'blocking' to
 *   'blocked' in the same batched write. Idempotent: calling close on an
 *   already-closed checklist is a no-op.
 */

export {};
