import { useEffect, useState } from 'react';
import { subscribeBranchesBasic } from '../infra/repositories/firestoreDashboardRepository';

/**
 * Returns a flat list of branches suitable for picker components.
 * Uses subscribeBranchesBasic from the dashboard repository which is
 * already tested and returns { id, name } objects ordered by Firestore
 * insertion order (super_admin can sort by name in the future).
 *
 * Do NOT confuse with useBranchesOverview — that hook returns dashboard
 * aggregation rows with assetCount / employeeCount; this returns the minimal
 * shape needed by form pickers.
 *
 * @returns {{ branches: Array<{ id: string, name: string }>, loading: boolean, error: Error | null }}
 */
export function useBranches() {
  const [branches, setBranches] = useState(/** @type {Array<{id:string,name:string}>} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  useEffect(() => {
    const unsub = subscribeBranchesBasic(
      (list) => {
        setBranches(list);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { branches, loading, error };
}
