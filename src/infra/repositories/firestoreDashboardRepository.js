// Firestore adapter for dashboard widgets.
//
// The dashboard now reads four KPIs and two live streams:
//   1. Total assets (server-side count aggregation)
//   2. Storage assets (server-side count, holderType=storage AND holderId==null)
//   3. Users (server-side count)
//   4. Branches (server-side count)
//   5. Licenses snapshot — fetched once and reduced in-memory: total seats +
//      summed cost of ACTIVE licenses (status=='active' OR no expiresAt OR
//      expiresAt in the future).
//
// Streams (still subscribed individually because they need to push updates):
//   - subscribeAssetHistory / subscribeRecentTransfers — live activity feed
//   - subscribeBranchesBasic — list of {id, name, address} for the geo table
//   - subscribeAssetBranchIds / subscribeUserBranchIds — derive per-branch
//     counts in-memory without streaming full asset/user docs.
//
// Components and hooks must NEVER import from 'firebase/firestore' directly;
// they go through this module so tests stay mockable and undici stays out of
// jsdom.

import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

/**
 * @typedef {Object} DashboardKpis
 * @property {number} totalAssets
 * @property {number} storageAssets         Assets where holderType==='storage' AND
 *                                          (holderId==null|''|missing). Equivalent to
 *                                          "available in storage / awaiting transfer".
 * @property {number} users
 * @property {number} branches
 * @property {number} totalSeats            Sum of `seatsTotal` (or `seats`) across /licenses.
 * @property {number} activeLicenseCostUsd  Sum of `priceUsd` (or `priceAmd / fxRate` if
 *                                          present) for licenses considered ACTIVE
 *                                          (no expiresAt OR expiresAt > now AND status !== 'archived').
 */

/**
 * Pull every dashboard KPI in parallel. Uses Firestore aggregation queries
 * (`getCountFromServer`) for the four counts — server-side, no doc reads
 * billed for the matching docs. Licenses are fetched once and reduced in
 * memory because we need two derived numbers (seats sum + cost sum) that
 * aggregation queries cannot compute server-side.
 *
 * Each promise is independently caught so a permission error on one
 * collection does not blank the whole dashboard — the failed counter
 * defaults to 0 and the first error is returned alongside the data.
 *
 * @returns {Promise<{ kpis: DashboardKpis, error: Error | null }>}
 */
export async function fetchDashboardKpis() {
  /** @type {Error | null} */
  let firstError = null;
  const remember = (err) => {
    // eslint-disable-next-line no-console
    console.warn('[dashboard] kpi fetch partial failure:', err);
    if (!firstError) firstError = err instanceof Error ? err : new Error(String(err));
  };

  const safeCount = async (q) => {
    try {
      const snap = await getCountFromServer(q);
      return snap.data().count;
    } catch (err) {
      remember(err);
      return 0;
    }
  };

  const totalAssetsP = safeCount(collection(db, 'assets'));
  const usersP = safeCount(collection(db, 'users'));
  const branchesP = safeCount(collection(db, 'branches'));
  // "Available in storage" = on storage shelf with no holder. Doc shape uses
  // holderType==='storage' AND holderId is empty/missing/null. We combine via
  // a single filtered count query.
  const storageP = (async () => {
    try {
      // First try the strict shape: holderType==='storage' AND holderId==''.
      const strict = query(
        collection(db, 'assets'),
        where('holderType', '==', 'storage'),
        where('holderId', '==', ''),
      );
      const snap = await getCountFromServer(strict);
      return snap.data().count;
    } catch (err) {
      // Fall back to the broader holderType filter — some legacy docs have
      // holderId === null / undefined which the equality filter above
      // misses. We accept the read cost here only on the fallback path.
      try {
        const broad = query(collection(db, 'assets'), where('holderType', '==', 'storage'));
        const snap = await getDocs(broad);
        return snap.docs.filter((d) => {
          const data = d.data();
          const id = data.holderId;
          return id === null || id === undefined || id === '';
        }).length;
      } catch (err2) {
        remember(err2 || err);
        return 0;
      }
    }
  })();

  const licensesP = (async () => {
    try {
      const snap = await getDocs(collection(db, 'licenses'));
      const now = Date.now();
      let seats = 0;
      let activeCostUsd = 0;
      for (const d of snap.docs) {
        const data = d.data() || {};
        const seatsTotal =
          typeof data.seatsTotal === 'number'
            ? data.seatsTotal
            : typeof data.seats === 'number'
              ? data.seats
              : 0;
        seats += seatsTotal;

        const expiresAt = toDate(data.expiresAt);
        const status = typeof data.status === 'string' ? data.status : 'active';
        const isActive =
          status !== 'archived' && (!expiresAt || expiresAt.getTime() > now);
        if (!isActive) continue;

        const priceUsd =
          typeof data.priceUsd === 'number'
            ? data.priceUsd
            : typeof data.priceAmd === 'number' && typeof data.fxRate === 'number' && data.fxRate > 0
              ? data.priceAmd / data.fxRate
              : 0;
        activeCostUsd += priceUsd;
      }
      return { seats, activeCostUsd };
    } catch (err) {
      remember(err);
      return { seats: 0, activeCostUsd: 0 };
    }
  })();

  const [totalAssets, users, branches, storageAssets, licenses] = await Promise.all([
    totalAssetsP,
    usersP,
    branchesP,
    storageP,
    licensesP,
  ]);

  return {
    kpis: {
      totalAssets,
      storageAssets,
      users,
      branches,
      totalSeats: licenses.seats,
      activeLicenseCostUsd: licenses.activeCostUsd,
    },
    error: firstError,
  };
}

/**
 * Count /assets (aggregation, not a stream).
 * Kept for back-compat with any callers still using single-counter access.
 * @returns {Promise<number>}
 */
export async function countAssets() {
  const snap = await getCountFromServer(collection(db, 'assets'));
  return snap.data().count;
}

/**
 * Subscribe to the *size* of a filtered / full collection. Streamed because
 * Firestore does not stream aggregations.
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
 * Live: items currently in storage (holderType === 'storage', no holder, status active).
 * Used by useBranchesOverview-derived live counts. The dashboard KPI itself
 * uses the cheaper one-shot `fetchDashboardKpis` aggregation.
 *
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeStorageCount(onChange, onError) {
  const q = query(collection(db, 'assets'), where('holderType', '==', 'storage'));
  return onSnapshot(
    q,
    (snap) => {
      const n = snap.docs.filter((d) => {
        const data = d.data();
        const s = data.status;
        const id = data.holderId;
        const noHolder = id === null || id === undefined || id === '';
        const active = s === 'active' || s === undefined;
        return active && noHolder;
      }).length;
      onChange(n);
    },
    onError,
  );
}

/** Convert a Firestore Timestamp|Date|null to Date|null. */
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Timestamp) return v.toDate();
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
 * Live: list of /branches with { id, name, address }. Address is the canonical
 * geographic label rendered by the dashboard's branches table; name remains
 * the fallback when address is missing.
 *
 * @param {(rows: Array<{id: string, name: string, address: string | null, capacity: number | null}>) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeBranchesBasic(onChange, onError) {
  return onSnapshot(
    collection(db, 'branches'),
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            name: typeof data.name === 'string' ? data.name : d.id,
            address: typeof data.address === 'string' && data.address.trim().length > 0
              ? data.address.trim()
              : null,
            capacity: typeof data.capacity === 'number' && data.capacity > 0 ? data.capacity : null,
          };
        })
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

/**
 * Live: count of pending (not confirmed/rejected/cancelled) transfers.
 * Transfers with status !== 'pending' and missing status field are excluded.
 *
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribePendingTransfersCount(onChange, onError) {
  const q = query(
    collection(db, 'transfers'),
    where('status', '==', 'pending')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.size),
    onError
  );
}

/**
 * Live: count of expired licenses (expiresAt <= now AND status !== 'archived').
 * Licenses without expiresAt field are considered active.
 *
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeExpiredLicensesCount(onChange, onError) {
  const now = Timestamp.now();
  const q = query(
    collection(db, 'licenses'),
    where('expiresAt', '<=', now),
    where('status', '!=', 'archived')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.size),
    onError
  );
}
