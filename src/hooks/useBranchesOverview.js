// useBranchesOverview — aggregate employee + asset counts per branch for the
// dashboard mini-table. All Firestore access goes through the dashboard
// repository so the hook is mockable and components never import
// firebase/firestore directly.

import { useEffect, useMemo, useState } from 'react';
import {
  subscribeBranchesBasic,
  subscribeAssetBranchIds,
  subscribeUserBranchIds,
} from '../infra/repositories/firestoreDashboardRepository';

/**
 * @typedef {Object} BranchRow
 * @property {string} id
 * @property {string} name
 * @property {number} assetCount
 * @property {number} employeeCount
 */

/** @returns {{ rows: BranchRow[], loading: boolean, error: Error | null }} */
export function useBranchesOverview() {
  const [branches, setBranches] = useState(/** @type {Array<{id:string,name:string}>} */ ([]));
  const [assetBranches, setAssetBranches] = useState(/** @type {string[]} */ ([]));
  const [userBranches, setUserBranches] = useState(/** @type {string[]} */ ([]));
  const [error, setError] = useState(/** @type {Error | null} */ (null));
  const [branchesReady, setBranchesReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [usersReady, setUsersReady] = useState(false);

  useEffect(() => {
    return subscribeBranchesBasic(
      (list) => {
        setBranches(list);
        setBranchesReady(true);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[branches-overview] branches error:', err);
        setError((prev) => prev ?? err);
        setBranches([]);
        setBranchesReady(true);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeAssetBranchIds(
      (list) => {
        setAssetBranches(list);
        setAssetsReady(true);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[branches-overview] assets error:', err);
        setError((prev) => prev ?? err);
        setAssetBranches([]);
        setAssetsReady(true);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeUserBranchIds(
      (list) => {
        setUserBranches(list);
        setUsersReady(true);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[branches-overview] users error:', err);
        setError((prev) => prev ?? err);
        setUserBranches([]);
        setUsersReady(true);
      }
    );
  }, []);

  const rows = useMemo(() => {
    const assetCounts = countBy(assetBranches);
    const userCounts = countBy(userBranches);
    return branches
      .map((b) => ({
        id: b.id,
        name: b.name,
        assetCount: assetCounts.get(b.id) || 0,
        employeeCount: userCounts.get(b.id) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, assetBranches, userBranches]);

  return { rows, loading: !(branchesReady && assetsReady && usersReady), error };
}

/**
 * @param {string[]} arr
 * @returns {Map<string, number>}
 */
function countBy(arr) {
  const out = new Map();
  for (const v of arr) out.set(v, (out.get(v) || 0) + 1);
  return out;
}
