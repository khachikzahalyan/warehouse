// TransferRepository — domain contract for the custody-transfer workflow.
// Implemented by src/infra/repositories/firestoreTransferRepository.js (Iteration 1).
//
// See `docs/superpowers/plans/firestore-schema-v1.md` §4.7 for the full
// state machine and the server-side rules that guard each transition.

/**
 * @typedef {'pending' | 'confirmed' | 'rejected' | 'cancelled'} TransferStatus
 *
 * @typedef {'user' | 'department' | 'storage'} HolderType
 *
 * @typedef {Object} HolderRef
 * @property {HolderType} type
 * @property {string} id
 * @property {string} displayName
 *
 * @typedef {Object} Transfer
 * @property {string} id
 * @property {string} code                 Human-readable, e.g. "TR-2026-000123".
 * @property {string[]} assetIds
 * @property {HolderRef} from
 * @property {HolderRef} to
 * @property {string | null} reason
 * @property {TransferStatus} status
 * @property {Date} initiatedAt
 * @property {Date | null} confirmedAt
 * @property {Date | null} rejectedAt
 * @property {Date | null} cancelledAt
 * @property {string | null} signaturePin  Nulled as soon as status leaves 'pending'. The UI shows it to the initiator only.
 * @property {string | null} notes
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {string} createdBy
 * @property {string} updatedBy
 *
 * @typedef {Object} TransferCreateInput
 * @property {HolderRef} from
 * @property {HolderRef} to
 * @property {string[]} assetIds          Non-empty. Every id must currently resolve to an asset held by `from`.
 * @property {string | null} [reason]
 * @property {string | null} [notes]
 *
 * @typedef {Object} TransferCreateResult
 * @property {string} id
 * @property {string} code
 * @property {string} pin                 4-digit PIN generated server-adjacent (see adapter). Shown once to the initiator.
 */

/**
 * Repository contract. Infra adapters implement this shape.
 *
 * @typedef {Object} TransferRepository
 * @property {(uid: string, onChange: (list: Transfer[]) => void, onError: (err: Error) => void) => () => void} subscribeIncoming
 * @property {(uid: string, onChange: (list: Transfer[]) => void, onError: (err: Error) => void) => () => void} subscribeOutgoing
 * @property {(uid: string, max: number, onChange: (list: Transfer[]) => void, onError: (err: Error) => void) => () => void} subscribeRecentForUser
 * @property {(input: TransferCreateInput) => Promise<TransferCreateResult>} createTransfer
 * @property {(args: { id: string, enteredPin: string }) => Promise<void>} confirmTransfer
 * @property {(args: { id: string }) => Promise<void>} rejectTransfer
 * @property {(args: { id: string }) => Promise<void>} cancelTransfer
 */

export {};
