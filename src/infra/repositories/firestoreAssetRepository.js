// src/infra/repositories/firestoreAssetRepository.js
// Firestore adapter for the Asset domain entity.
//
// All Firebase imports are confined to this file; hooks and components must
// not import from 'firebase/firestore' directly — they call the factory below.
//
// Factory pattern: `createAssetRepository({ uid })` returns a repository
// instance bound to the authenticated user's uid. Injecting uid via the
// factory makes the repo testable without touching global auth state.
// Matches the plain-functions style of firestoreDashboardRepository.js but
// uses a factory because writes require a uid.

// ─── UNIQUENESS STRATEGY ───────────────────────────────────────────────────────
// The system enforces uniqueness on three fields:
//   - sku (required for devices/furniture if price > tracking threshold)
//   - barcode (optional, must be unique if present)
//   - serialNumber (optional, must be unique if present)
//
// Implementation:
//   1. Client-side pre-write check via `isSkuUnique()`, `isBarcodeUnique()`,
//      `isSerialUnique()` queries to catch most cases immediately.
//   2. Throw UniqueConstraintError if conflict found, to surface UX feedback.
//   3. Race condition handling: rules on /uniqueFields/{type}/{value} gate
//      the write at Firestore level. Transactions ensure atomicity.
//   4. See firestore.rules for the /uniqueFields auxiliary collection structure.

// ─── IMAGE HANDLING (FUTURE) ───────────────────────────────────────────────────
// Asset images are stored in Firebase Storage at:
//   gs://warehouse-39357.firebasestorage.app/assets/{assetId}/...
// 
// Asset docs store the download URL (or relative path) in the `imagePath` field.
// File uploads are handled in a separate storage layer (not yet in this repo);
// see src/lib/firebase.js for Storage initialization when image upload is added.
// This adapter does NOT handle uploads — only stores/reads the path reference.

import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ASSETS = 'assets';

// ─── UniqueConstraintError ─────────────────────────────────────────────────────

/**
 * Thrown by `create` when a pre-write uniqueness check fails.
 * Callers (e.g. useAssetCreate) should catch this specifically and surface the
 * `field` + `conflictingId` to the form's error state.
 */
export class UniqueConstraintError extends Error {
  /**
   * @param {'sku' | 'barcode' | 'serialNumber' | string} field
   * @param {string} value
   * @param {string | null} conflictingId
   */
  constructor(field, value, conflictingId) {
    super(`UniqueConstraintError: ${field} "${value}" already exists (conflicting id: ${conflictingId ?? 'unknown'})`);
    this.name = 'UniqueConstraintError';
    this.field = field;
    this.value = value;
    this.conflictingId = conflictingId;
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert Firestore Timestamp|Date|null → Date|null at the adapter boundary. */
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  return null;
}

/**
 * Map a DocumentSnapshot to a plain Asset domain object.
 * Firestore types (`Timestamp`, `DocumentReference`) do not leak past this fn.
 *
 * @param {{ id: string, data: () => Record<string, unknown> }} snap
 * @returns {import('../../domain/repositories/AssetRepository').Asset}
 */
function toAsset(snap) {
  const d = snap.data();
  return {
    ...d,
    id: snap.id,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    purchaseDate: toDate(d.purchaseDate),
    warrantyStart: toDate(d.warrantyStart),
    warrantyEnd: toDate(d.warrantyEnd),
    acquiredAt: toDate(d.acquiredAt),
    retiredAt: toDate(d.retiredAt),
  };
}

/**
 * Build a reusable field-level uniqueness checker.
 *
 * @param {string} field  Firestore field name to query.
 * @returns {(value: string, exceptId?: string) => Promise<import('../../domain/repositories/AssetRepository').UniqueCheckResult>}
 */
function makeUniqueChecker(field) {
  return async function check(value, exceptId) {
    if (!value) return { unique: true, conflictId: null, conflictName: null };
    const q = query(collection(db, ASSETS), where(field, '==', value), limit(2));
    const snap = await getDocs(q);
    if (snap.empty) return { unique: true, conflictId: null, conflictName: null };
    const hit = snap.docs.find((d) => d.id !== exceptId);
    if (!hit) return { unique: true, conflictId: null, conflictName: null };
    const data = hit.data();
    return { unique: false, conflictId: hit.id, conflictName: data?.name ?? null };
  };
}

// ─── factory ──────────────────────────────────────────────────────────────────

/**
 * Create an AssetRepository instance.
 *
 * Pass `{ uid }` for any instance that needs to perform writes. Read-only
 * operations (getById, subscribeStorage, uniqueness checks) work without a uid.
 *
 * @param {{ uid?: string }} [opts]
 * @returns {import('../../domain/repositories/AssetRepository').AssetRepository & {
 *   subscribeStorage: (
 *     opts: import('../../domain/repositories/AssetRepository').SubscribeStorageOpts,
 *     onChange: (assets: import('../../domain/repositories/AssetRepository').Asset[]) => void,
 *     onError: (err: Error) => void,
 *   ) => () => void,
 * }}
 */
export function createAssetRepository(opts = {}) {
  const isSkuUnique = makeUniqueChecker('sku');
  const isBarcodeUnique = makeUniqueChecker('barcode');
  const isSerialUnique = makeUniqueChecker('serialNumber');

  // ── getById ────────────────────────────────────────────────────────────────

  /**
   * @param {string} id
   * @returns {Promise<import('../../domain/repositories/AssetRepository').Asset | null>}
   */
  async function getById(id) {
    const snap = await getDoc(doc(db, ASSETS, id));
    return snap.exists() ? toAsset(snap) : null;
  }

  // ── create ─────────────────────────────────────────────────────────────────

  /**
   * Write a new asset to Firestore.
   *
   * The caller (form/hook) is responsible for:
   *   - Full field validation (required fields, format checks).
   *   - Pre-computing `priceUsd` and `isTracked` via `src/domain/pricing.js`.
   *
   * This function performs a final race-aware uniqueness check immediately
   * before the write and throws `UniqueConstraintError` on collision.
   *
   * @param {import('../../domain/repositories/AssetRepository').AssetCreateInput & {
   *   priceUsd: number | null,
   *   isTracked: boolean,
   *   quantity: number,
   * }} input
   * @returns {Promise<string>} The id of the created document.
   */
  async function create(input) {
    const uid = opts.uid;
    if (!uid) throw new Error('createAssetRepository: uid is required for write operations');

    // Race-aware uniqueness pre-write checks — Firestore rules cannot enforce
    // cross-document uniqueness, so the repo is the last line of defence.
    const skuCheck = await isSkuUnique(input.sku);
    if (!skuCheck.unique) {
      throw new UniqueConstraintError('sku', input.sku, skuCheck.conflictId);
    }

    // Tracked → check serialNumber; non-tracked → check barcode.
    if (input.isTracked && input.serialNumber) {
      const snCheck = await isSerialUnique(input.serialNumber);
      if (!snCheck.unique) {
        throw new UniqueConstraintError('serialNumber', input.serialNumber, snCheck.conflictId);
      }
    } else if (!input.isTracked && input.barcode) {
      const bcCheck = await isBarcodeUnique(input.barcode);
      if (!bcCheck.unique) {
        throw new UniqueConstraintError('barcode', input.barcode, bcCheck.conflictId);
      }
    }

    // Enforce quantity = 1 for tracked assets.
    const quantity = input.isTracked ? 1 : (input.quantity ?? 1);

    // Kind taxonomy (Feature 2). Default to 'other' for back-compat with any
    // older caller that doesn't pass `kind`; flag those rows for review.
    const kind = input.kind || 'other';
    const needsReview =
      typeof input.needsReview === 'boolean' ? input.needsReview : kind === 'other';

    const now = serverTimestamp();
    const payload = {
      sku: input.sku,
      name: input.name,
      description: input.description ?? '',
      nameI18n: input.nameI18n ?? null,
      descriptionI18n: input.descriptionI18n ?? null,
      sourceLanguage: input.sourceLanguage,
      kind,
      needsReview,
      category: input.category,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber ?? null,
      barcode: input.barcode ?? null,
      qrCodeId: input.qrCodeId ?? null,
      tags: input.tags ?? [],
      branchId: input.branchId,
      departmentId: input.departmentId ?? null,
      holderType: input.holderType,
      holderId: input.holderId,
      holder: {
        type: input.holderType,
        id: input.holderId,
        displayName: input.holderDisplayName,
      },
      purchasePrice: input.purchasePrice ?? null,
      currency: input.currency ?? 'AMD',
      priceUsd: input.priceUsd ?? null,
      quantity,
      isTracked: !!input.isTracked,
      purchaseDate: input.purchaseDate ?? null,
      supplier: input.supplier ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      warrantyProvider: input.warrantyProvider ?? null,
      warrantyStart: input.warrantyStart ?? null,
      warrantyEnd: input.warrantyEnd ?? null,
      status: 'active',
      condition: input.condition ?? 'new',
      acquiredAt: input.acquiredAt ?? null,
      retiredAt: null,
      pendingTransferId: null,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    const ref = await addDoc(collection(db, ASSETS), payload);
    return ref.id;
  }

  // ── subscribeStorage ───────────────────────────────────────────────────────

  /**
   * Live list of assets currently in storage (holderType === 'storage'),
   * ordered newest-first.
   *
   * @param {import('../../domain/repositories/AssetRepository').SubscribeStorageOpts} storageOpts
   * @param {(assets: import('../../domain/repositories/AssetRepository').Asset[]) => void} onChange
   * @param {(err: Error) => void} onError
   * @returns {() => void} unsubscribe
   */
  function subscribeStorage(storageOpts = {}, onChange, onError) {
    // Single equality filter only — avoids requiring a Firestore composite
    // index. We sort + cap in memory below.
    const constraints = [where('holderType', '==', 'storage')];
    if (storageOpts.branchId) {
      constraints.push(where('branchId', '==', storageOpts.branchId));
    }

    const q = query(collection(db, ASSETS), ...constraints);
    const cap = storageOpts.limit ?? 200;
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(toAsset)
          .filter((a) => a.status === 'active' || a.status === undefined)
          .sort((a, b) => {
            const ta = a.createdAt ? a.createdAt.getTime() : 0;
            const tb = b.createdAt ? b.createdAt.getTime() : 0;
            return tb - ta;
          })
          .slice(0, cap);
        onChange(list);
      },
      onError,
    );
  }

  // ── update ─────────────────────────────────────────────────────────────────

  /**
   * Patch an existing asset. Stamps updatedAt + updatedBy automatically.
   * @param {string} id
   * @param {Record<string, unknown>} patch
   */
  async function update(id, patch) {
    const uid = opts.uid;
    if (!uid) throw new Error('createAssetRepository: uid is required for write operations');
    const ref = doc(db, ASSETS, id);
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  }

  // ── archive (soft delete) ──────────────────────────────────────────────────

  /**
   * Soft-delete an asset by flipping its status to 'archived'.
   * Records retiredAt server-side.
   * @param {string} id
   */
  async function archive(id) {
    await update(id, { status: 'archived', retiredAt: serverTimestamp() });
  }

  // ── transferImmediate (TRIAL — no pending state, no PIN) ───────────────────

  /**
   * Immediate transfer (TRIAL — no pending state, no PIN).
   * TODO(iter-2): replace with createTransferRequest + confirmTransfer + PIN flow.
   * TODO(iter-2): also write a /movements/ log doc here once the collection exists.
   *
   * @param {string} assetId
   * @param {{ type: 'branch'|'employee', id: string, displayName: string, branchId?: string|null, note?: string }} target
   */
  async function transferImmediate(assetId, target) {
    const patch = {
      holderType: target.type,
      holderId: target.id,
      holder: { type: target.type, id: target.id, displayName: target.displayName },
      branchId: target.type === 'branch' ? target.id : (target.branchId ?? null),
    };
    await update(assetId, patch);
  }

  return {
    getById,
    create,
    update,
    archive,
    transferImmediate,
    subscribeStorage,
    isSkuUnique,
    isBarcodeUnique,
    isSerialUnique,
  };
}
