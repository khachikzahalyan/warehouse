// ReturnChecklist — domain typedef for the offboarding flow.
//
// When an admin initiates "dismiss employee" (status transition
// active → blocking), a ReturnChecklist document is created listing every
// asset currently assigned to that user. An admin then ticks each item green
// as the physical asset comes back, or marks it with a note (lost / damaged
// / pending). While the checklist is `open`, the user stays in status
// 'blocking'; once all items are resolved and the admin closes the
// checklist, the user transitions to 'blocked' and the checklist snapshot
// is preserved forever for audit.
//
// Zero runtime code here — JSDoc + a couple of frozen enums + narrowers.
// The Firestore adapter (infra layer, NOT in Step 1) is responsible for
// converting the raw document into this shape.

/**
 * @typedef {'open' | 'closed'} ReturnChecklistStatus
 */

/** Frozen list of valid ReturnChecklist statuses. */
export const RETURN_CHECKLIST_STATUSES = Object.freeze(['open', 'closed']);

/**
 * Narrow an unknown value to a ReturnChecklistStatus. Unknown → 'open'
 * (an unresolved checklist is safer than silently closing one).
 *
 * @param {unknown} value
 * @returns {ReturnChecklistStatus}
 */
export function toReturnChecklistStatus(value) {
  return RETURN_CHECKLIST_STATUSES.includes(
    /** @type {ReturnChecklistStatus} */ (value)
  )
    ? /** @type {ReturnChecklistStatus} */ (value)
    : 'open';
}

/**
 * One row in the checklist. Mirrors one asset that was assigned to the user
 * at the moment the checklist was opened.
 *
 * - `returned`     : true once the admin ticks the item green.
 * - `note`         : free-form reason for non-standard outcomes ("lost",
 *                    "reimbursed", "damaged — written off"). Empty string
 *                    is equivalent to "no note".
 * - `returnedAt`   : timestamp of the last tick (or last untick — client
 *                    should always refresh it on write). null while pending.
 * - `confirmedBy`  : uid of the admin who toggled it. null while pending.
 *
 * @typedef {Object} ReturnChecklistItem
 * @property {string}      assetId
 * @property {boolean}     returned
 * @property {string}      note
 * @property {Date | null} returnedAt
 * @property {string | null} confirmedBy
 */

/**
 * Full document projected for UI consumption. Timestamps are Date objects;
 * the Firestore Timestamp type does not leak past the infra layer.
 *
 * @typedef {Object} ReturnChecklist
 * @property {string}                   id
 * @property {string}                   userId        The employee being offboarded.
 * @property {string}                   createdBy     uid of the admin who opened it.
 * @property {Date}                     createdAt
 * @property {ReturnChecklistStatus}    status
 * @property {ReturnChecklistItem[]}    items
 * @property {Date | null}              closedAt      null while status === 'open'.
 * @property {string | null}            closedBy      null while status === 'open'.
 */

/**
 * Input for creating a new ReturnChecklist. `id`, `createdAt`, `status`,
 * `closedAt`, `closedBy` are filled by the repository / rules; callers
 * supply the user and the initial items they want tracked.
 *
 * @typedef {Object} ReturnChecklistCreateInput
 * @property {string} userId
 * @property {string} createdBy
 * @property {Array<{ assetId: string, note?: string }>} items
 */

/**
 * Patch accepted by ReturnChecklistRepository.update. Any item-level toggle
 * is applied by index; the repository merges the patch into the stored
 * items array preserving order.
 *
 * @typedef {Object} ReturnChecklistItemPatch
 * @property {number} index                Position of the item inside `items`.
 * @property {boolean} [returned]
 * @property {string}  [note]
 * @property {string}  confirmedBy         uid of the admin performing the patch.
 */

export {};
