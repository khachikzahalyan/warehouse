// Firestore adapter for dashboard widgets.
//
// The dashboard reads small aggregate numbers and two live streams. Each
// helper below is a thin wrapper over the Firestore SDK so the hooks in
// src/hooks/* never import 'firebase/firestore' directly — this keeps the
// hooks mockable in tests without pulling in undici / the whole SDK.

import {
  collection,
  collectionGroup,
  getCountFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

/**
 * Count /assets (aggregation, not a stream).
 * @returns {Promise<number>}
 */
export async function countAssets() {
  const snap = await getCountFromServer(collection(db, 'assets'));
  return snap.data().count;
}

/**
 * Subscribe to the *size* of a filtered / full collection. We don't need the
 * documents for stat cards, just the count; but Firestore does not stream
 * aggregations, so we stream the docs and hand back snap.size.
 *
 * @param {'users' | 'branches'} col
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeCount(col, onChange, onError) {
  return onSnapshot(
    collection(db, col),
    (snap) => onChange(snap.size),
    onError
  );
}

/**
 * Live: pending transfers.
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribePendingTransfersCount(onChange, onError) {
  const q = query(collection(db, 'transfers'), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => onChange(snap.size), onError);
}

/**
 * Live: expired licenses (expiresAt < now).
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeExpiredLicensesCount(onChange, onError) {
  const now = Timestamp.now();
  const q = query(collection(db, 'licenses'), where('expiresAt', '<', now));
  return onSnapshot(q, (snap) => onChange(snap.size), onError);
}

/** Convert a Firestore Timestamp|Date|null to Date|null. */
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  return null;
}

/**
 * Live: latest 10 asset-history events (collectionGroup).
 * Emits domain-shaped events so hooks don't re-map snapshots.
 *
 * @param {(events: import('../../hooks/useRecentActivity').ActivityEvent[]) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeAssetHistory(onChange, onError) {
  const q = query(collectionGroup(db, 'history'), orderBy('at', 'desc'), limit(10));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const assetId = d.ref.parent.parent ? d.ref.parent.parent.id : null;
        const rawType = typeof data.eventType === 'string' ? data.eventType : 'updated';
        return {
          id: `history:${d.id}`,
          source: /** @type {const} */ ('asset'),
          eventType: `asset.${rawType}`,
          at: toDate(data.at) || new Date(0),
          assetId,
          transferId: typeof data.transferId === 'string' ? data.transferId : null,
          by: typeof data.by === 'string' ? data.by : null,
        };
      });
      onChange(list);
    },
    onError
  );
}

/**
 * Live: latest 10 transfers by updatedAt.
 * @param {(events: import('../../hooks/useRecentActivity').ActivityEvent[]) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeRecentTransfers(onChange, onError) {
  const q = query(collection(db, 'transfers'), orderBy('updatedAt', 'desc'), limit(10));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const status = typeof data.status === 'string' ? data.status : 'pending';
        const at =
          toDate(data.updatedAt) ||
          toDate(data.confirmedAt) ||
          toDate(data.rejectedAt) ||
          toDate(data.cancelledAt) ||
          toDate(data.initiatedAt) ||
          new Date(0);
        return {
          id: `transfer:${d.id}`,
          source: /** @type {const} */ ('transfer'),
          eventType: `transfer.${status}`,
          at,
          assetId: null,
          transferId: d.id,
          by: typeof data.updatedBy === 'string' ? data.updatedBy : null,
        };
      });
      onChange(list);
    },
    onError
  );
}

/**
 * Live: list of /branches with just { id, name }.
 * @param {(rows: Array<{id: string, name: string}>) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeBranchesBasic(onChange, onError) {
  return onSnapshot(
    collection(db, 'branches'),
    (snap) => {
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          name: typeof d.data().name === 'string' ? d.data().name : d.id,
        }))
      );
    },
    onError
  );
}

/**
 * Live: branchId string for every asset. Used to derive per-branch asset
 * counts in-memory without streaming full asset docs.
 *
 * @param {(branchIds: string[]) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeAssetBranchIds(onChange, onError) {
  return onSnapshot(
    collection(db, 'assets'),
    (snap) => {
      onChange(
        snap.docs
          .map((d) => d.data().branchId)
          .filter((v) => typeof v === 'string')
      );
    },
    onError
  );
}

/**
 * Live: branchId string for every user. Used to derive per-branch employee
 * counts in-memory without streaming full user docs.
 *
 * @param {(branchIds: string[]) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeUserBranchIds(onChange, onError) {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      onChange(
        snap.docs
          .map((d) => d.data().branchId)
          .filter((v) => typeof v === 'string')
      );
    },
    onError
  );
}
