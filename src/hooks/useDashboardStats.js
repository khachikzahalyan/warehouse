// useDashboardStats — thin realtime aggregator for the Dashboard page.
//
// Data access goes through the firestoreDashboardRepository so the hook
// stays mockable in tests and components never pull in firebase/firestore
// directly. Each counter starts at null, flips to a number on the first
// snapshot, and loading becomes false once every counter has reported.
//
// On a permission-denied / missing-index error the counter falls back to
// 0 and we surface the first error via `error` — the page renders a muted
// empty card rather than crashing.

import { useEffect, useState } from 'react';
import {
  countAssets,
  subscribeCount,
  subscribePendingTransfersCount,
  subscribeExpiredLicensesCount,
  subscribeStorageCount,
} from '../infra/repositories/firestoreDashboardRepository';

/**
 * @typedef {Object} DashboardStats
 * @property {number | null} totalAssets
 * @property {number | null} storageAssets
 * @property {number | null} pendingTransfers
 * @property {number | null} users
 * @property {number | null} branches
 * @property {number | null} expiredLicenses
 * @property {boolean} loading
 * @property {Error | null} error
 */

/** @returns {DashboardStats} */
export function useDashboardStats() {
  const [totalAssets, setTotalAssets] = useState(/** @type {number|null} */ (null));
  const [storageAssets, setStorage] = useState(/** @type {number|null} */ (null));
  const [pendingTransfers, setPending] = useState(/** @type {number|null} */ (null));
  const [users, setUsers] = useState(/** @type {number|null} */ (null));
  const [branches, setBranches] = useState(/** @type {number|null} */ (null));
  const [expiredLicenses, setExpired] = useState(/** @type {number|null} */ (null));
  const [error, setError] = useState(/** @type {Error | null} */ (null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    countAssets()
      .then((n) => {
        if (!cancelled) setTotalAssets(n);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[dashboard] asset count failed:', err);
        setTotalAssets(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeStorageCount(
      (n) => setStorage(n),
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[dashboard] storage assets error:', err);
        setError((prev) => prev ?? err);
        setStorage(0);
      }
    );
  }, []);

  useEffect(() => {
    return subscribePendingTransfersCount(
      (n) => setPending(n),
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[dashboard] pending transfers error:', err);
        setError((prev) => prev ?? err);
        setPending(0);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeCount(
      'users',
      (n) => setUsers(n),
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[dashboard] users error:', err);
        setError((prev) => prev ?? err);
        setUsers(0);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeCount(
      'branches',
      (n) => setBranches(n),
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[dashboard] branches error:', err);
        setError((prev) => prev ?? err);
        setBranches(0);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeExpiredLicensesCount(
      (n) => setExpired(n),
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[dashboard] expired licenses error:', err);
        setError((prev) => prev ?? err);
        setExpired(0);
      }
    );
  }, []);

  useEffect(() => {
    if (
      totalAssets !== null &&
      storageAssets !== null &&
      pendingTransfers !== null &&
      users !== null &&
      branches !== null &&
      expiredLicenses !== null
    ) {
      setLoading(false);
    }
  }, [totalAssets, storageAssets, pendingTransfers, users, branches, expiredLicenses]);

  return { totalAssets, storageAssets, pendingTransfers, users, branches, expiredLicenses, loading, error };
}
