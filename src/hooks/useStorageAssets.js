import { useEffect, useState } from 'react';

/**
 * Subscribes to storage-mode assets via the provided repository.
 *
 * @param {{ subscribeStorage: (onChange: (assets: any[]) => void, onError: (e: Error) => void) => () => void }} repo
 * @returns {{ assets: any[], loading: boolean, error: Error | null }}
 */
export function useStorageAssets(repo) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  useEffect(() => {
    const unsub = repo.subscribeStorage(
      {},
      (list) => {
        setAssets(list);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('[useStorageAssets] subscription error:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [repo]);

  return { assets, loading, error };
}
