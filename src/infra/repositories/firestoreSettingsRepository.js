// src/infra/repositories/firestoreSettingsRepository.js
// Adapter for /settings/* singletons:
//   /settings/warehouse                   — numeric tunables
//   /settings/exchangeRates               — currency rate
//   /settings/global_lists/assetKinds     — super_admin-curated extra kinds
//                                           merged with the hardcoded set.
//
// All read paths return safe hard-coded defaults / empty arrays when the
// doc is missing so the rest of the app never crashes on a fresh Firestore
// project that has no settings yet.

import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  DEFAULT_TRACKING_THRESHOLD_USD,
  DEFAULT_USD_TO_AMD,
  DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
} from '../../domain/pricing';

/** @typedef {import('../../domain/settingsKeys').WarehouseSettings} WarehouseSettings */
/** @typedef {import('../../domain/settingsKeys').ExchangeRates} ExchangeRates */

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a raw Firestore value, return it if it is a finite number > 0, or the
 * provided default otherwise.
 *
 * @param {unknown} raw
 * @param {number} fallback
 * @returns {number}
 */
function safePositiveNumber(raw, fallback) {
  return typeof raw === 'number' && isFinite(raw) && raw > 0 ? raw : fallback;
}

// ─── one-shot reads ────────────────────────────────────────────────────────────

/**
 * Read /settings/warehouse once.
 * Never throws — returns defaults on any failure or missing doc.
 *
 * @returns {Promise<WarehouseSettings>}
 */
export async function getWarehouseSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'warehouse'));
    const data = snap.exists() ? snap.data() : null;
    return {
      trackingThresholdUsd: safePositiveNumber(
        data?.trackingThresholdUsd,
        DEFAULT_TRACKING_THRESHOLD_USD,
      ),
      inventoryCodeThresholdAmd: safePositiveNumber(
        data?.inventoryCodeThresholdAmd,
        DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
      ),
    };
  } catch {
    return {
      trackingThresholdUsd: DEFAULT_TRACKING_THRESHOLD_USD,
      inventoryCodeThresholdAmd: DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
    };
  }
}

/**
 * Read /settings/exchangeRates once.
 * Never throws — returns defaults on any failure or missing doc.
 *
 * @returns {Promise<ExchangeRates>}
 */
export async function getExchangeRates() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'exchangeRates'));
    const data = snap.exists() ? snap.data() : null;
    return {
      usdToAmd: safePositiveNumber(data?.usdToAmd, DEFAULT_USD_TO_AMD),
    };
  } catch {
    return { usdToAmd: DEFAULT_USD_TO_AMD };
  }
}

// ─── live subscriptions ────────────────────────────────────────────────────────

/**
 * Subscribe to /settings/warehouse.
 * Emits a merged-with-defaults WarehouseSettings on every snapshot, including
 * the first. Uses fallback values when the doc is missing or the field is invalid.
 *
 * @param {(settings: WarehouseSettings) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void} unsubscribe
 */
export function subscribeWarehouseSettings(onChange, onError) {
  const ref = doc(db, 'settings', 'warehouse');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      onChange({
        trackingThresholdUsd: safePositiveNumber(
          data?.trackingThresholdUsd,
          DEFAULT_TRACKING_THRESHOLD_USD,
        ),
        inventoryCodeThresholdAmd: safePositiveNumber(
          data?.inventoryCodeThresholdAmd,
          DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
        ),
      });
    },
    onError,
  );
}

/**
 * Persist a partial update to /settings/warehouse. Only the fields supplied
 * are touched; missing keys are left as-is. Caller is responsible for
 * permission gating (super_admin only).
 *
 * @param {Partial<WarehouseSettings>} patch
 * @returns {Promise<void>}
 */
export async function updateWarehouseSettings(patch) {
  const { setDoc } = await import('firebase/firestore');
  const ref = doc(db, 'settings', 'warehouse');
  /** @type {Record<string, unknown>} */
  const cleaned = {};
  if (typeof patch?.trackingThresholdUsd === 'number' && patch.trackingThresholdUsd > 0) {
    cleaned.trackingThresholdUsd = patch.trackingThresholdUsd;
  }
  if (typeof patch?.inventoryCodeThresholdAmd === 'number' && patch.inventoryCodeThresholdAmd > 0) {
    cleaned.inventoryCodeThresholdAmd = patch.inventoryCodeThresholdAmd;
  }
  if (Object.keys(cleaned).length === 0) return;
  await setDoc(ref, cleaned, { merge: true });
}

/**
 * Subscribe to /settings/exchangeRates.
 * Emits a merged-with-defaults ExchangeRates on every snapshot.
 *
 * @param {(rates: ExchangeRates) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void} unsubscribe
 */
export function subscribeExchangeRates(onChange, onError) {
  const ref = doc(db, 'settings', 'exchangeRates');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      onChange({
        usdToAmd: safePositiveNumber(data?.usdToAmd, DEFAULT_USD_TO_AMD),
      });
    },
    onError,
  );
}

// ─── Custom asset kinds ────────────────────────────────────────────────────────

/**
 * One super_admin-defined extra kind. Coexists with the hardcoded set.
 *
 * @typedef {Object} CustomAssetKind
 * @property {string} id                              Stable, lowercase, snake_case id (used as the segmented-control value AND the Firestore field on the asset doc).
 * @property {{ en?: string, ru?: string, hy?: string }} labels  Locale-keyed display labels. Missing locales fall back to id.
 * @property {string[]} types                         Initial type ids the super_admin entered (free-form strings — no per-locale labels yet).
 */

/**
 * Narrow an unknown value to a clean CustomAssetKind, or null if it can't be
 * salvaged. We are defensive because `/settings/global_lists/assetKinds` is
 * hand-edited by super_admin and may contain partial drafts.
 *
 * @param {unknown} raw
 * @returns {CustomAssetKind | null}
 */
function toCustomKind(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const r = /** @type {Record<string, unknown>} */ (raw);
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  if (!id) return null;
  const labelsRaw = r.labels && typeof r.labels === 'object' ? r.labels : {};
  const lr = /** @type {Record<string, unknown>} */ (labelsRaw);
  /** @type {{ en?: string, ru?: string, hy?: string }} */
  const labels = {};
  for (const lng of /** @type {const} */ (['en', 'ru', 'hy'])) {
    const v = lr[lng];
    if (typeof v === 'string' && v.trim()) labels[lng] = v.trim();
  }
  const typesRaw = Array.isArray(r.types) ? r.types : [];
  const types = typesRaw
    .filter((t) => typeof t === 'string' && t.trim())
    .map((t) => /** @type {string} */ (t).trim());
  return { id, labels, types };
}

/**
 * Read /settings/global_lists/assetKinds once. Always resolves; missing or
 * malformed docs collapse to an empty array so the caller can safely merge
 * with the hardcoded ASSET_KINDS list.
 *
 * @returns {Promise<CustomAssetKind[]>}
 */
export async function getCustomAssetKinds() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global_lists'));
    const data = snap.exists() ? snap.data() : null;
    const arr = Array.isArray(data?.assetKinds) ? data.assetKinds : [];
    /** @type {CustomAssetKind[]} */
    const out = [];
    for (const raw of arr) {
      const norm = toCustomKind(raw);
      if (norm) out.push(norm);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Subscribe to /settings/global_lists/assetKinds. Emits the merged-and-
 * normalized array on every snapshot, including the first.
 *
 * @param {(kinds: CustomAssetKind[]) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void} unsubscribe
 */
export function subscribeCustomAssetKinds(onChange, onError) {
  const ref = doc(db, 'settings', 'global_lists');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const arr = Array.isArray(data?.assetKinds) ? data.assetKinds : [];
      /** @type {CustomAssetKind[]} */
      const out = [];
      for (const raw of arr) {
        const norm = toCustomKind(raw);
        if (norm) out.push(norm);
      }
      onChange(out);
    },
    onError,
  );
}

/**
 * Append a single CustomAssetKind to /settings/global_lists/assetKinds. Uses
 * a transactional read-merge-write so concurrent appends from two tabs do
 * not clobber each other. Caller is responsible for permission gating
 * (super_admin only — Firestore rules enforce the same).
 *
 * Rejects when `kind.id` already exists (case-insensitive) so duplicates
 * can't sneak in.
 *
 * @param {CustomAssetKind} kind
 * @returns {Promise<void>}
 */
export async function addCustomAssetKind(kind) {
  const norm = toCustomKind(kind);
  if (!norm) throw new Error('Invalid custom kind');
  const { runTransaction, setDoc } = await import('firebase/firestore');
  const ref = doc(db, 'settings', 'global_lists');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    /** @type {CustomAssetKind[]} */
    const existing = [];
    if (snap.exists()) {
      const data = snap.data();
      const arr = Array.isArray(data?.assetKinds) ? data.assetKinds : [];
      for (const raw of arr) {
        const c = toCustomKind(raw);
        if (c) existing.push(c);
      }
    }
    if (existing.some((c) => c.id.toLowerCase() === norm.id.toLowerCase())) {
      throw new Error(`Kind id "${norm.id}" already exists`);
    }
    const next = [...existing, norm];
    if (snap.exists()) {
      tx.update(ref, { assetKinds: next });
    } else {
      // setDoc inside a transaction is not allowed; create with tx.set.
      tx.set(ref, { assetKinds: next });
    }
    // setDoc reference kept so eslint doesn't strip the dynamic import.
    void setDoc;
  });
}
