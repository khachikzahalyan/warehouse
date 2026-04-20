// useRecentActivity — latest events across the system, merged from two
// Firestore streams (asset history + transfers), sorted desc by time,
// capped at 10. All Firestore access goes through the repository layer.

import { useEffect, useMemo, useState } from 'react';
import {
  subscribeAssetHistory,
  subscribeRecentTransfers,
} from '../infra/repositories/firestoreDashboardRepository';

/**
 * @typedef {Object} ActivityEvent
 * @property {string} id
 * @property {'asset' | 'transfer'} source
 * @property {string} eventType
 * @property {Date} at
 * @property {string | null} assetId
 * @property {string | null} transferId
 * @property {string | null} by
 */

/** @returns {{ events: ActivityEvent[], loading: boolean, error: Error | null }} */
export function useRecentActivity() {
  const [historyEvents, setHistoryEvents] = useState(/** @type {ActivityEvent[]} */ ([]));
  const [transferEvents, setTransferEvents] = useState(/** @type {ActivityEvent[]} */ ([]));
  const [error, setError] = useState(/** @type {Error | null} */ (null));
  const [historyReady, setHistoryReady] = useState(false);
  const [transfersReady, setTransfersReady] = useState(false);

  useEffect(() => {
    return subscribeAssetHistory(
      (list) => {
        setHistoryEvents(list);
        setHistoryReady(true);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[recent-activity] history error:', err);
        setError((prev) => prev ?? err);
        setHistoryEvents([]);
        setHistoryReady(true);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeRecentTransfers(
      (list) => {
        setTransferEvents(list);
        setTransfersReady(true);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[recent-activity] transfers error:', err);
        setError((prev) => prev ?? err);
        setTransferEvents([]);
        setTransfersReady(true);
      }
    );
  }, []);

  const events = useMemo(() => {
    const merged = [...historyEvents, ...transferEvents];
    merged.sort((a, b) => b.at.getTime() - a.at.getTime());
    return merged.slice(0, 10);
  }, [historyEvents, transferEvents]);

  return { events, loading: !(historyReady && transfersReady), error };
}
