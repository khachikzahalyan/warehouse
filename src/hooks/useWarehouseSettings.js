// src/hooks/useWarehouseSettings.js
// Live combined settings hook used by the Add-asset Drawer and the
// Warehouse settings UI.
//
// Subscribes to both /settings/warehouse and /settings/exchangeRates in
// parallel. Returns the most-recently-received values; until the first
// snapshot arrives the hard-coded defaults from `src/domain/pricing.js` are
// returned so the form is always in a functional state.
//
// TODO(settings-ui): once a super_admin Settings page exists for editing
// these tunables, expose `updateWarehouseSettings` from the settings repo
// through this hook (or a sibling `useUpdateWarehouseSettings`). The
// write surface is intentionally NOT in this hook today — read and write
// are kept apart so most call sites only subscribe.

import { useEffect, useState } from 'react';
import {
  subscribeWarehouseSettings,
  subscribeExchangeRates,
} from '../infra/repositories/firestoreSettingsRepository';
import {
  DEFAULT_TRACKING_THRESHOLD_USD,
  DEFAULT_USD_TO_AMD,
  DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
} from '../domain/pricing';

/**
 * @returns {{
 *   trackingThresholdUsd: number,
 *   inventoryCodeThresholdAmd: number,
 *   usdToAmd: number,
 *   thresholdError: Error | null,
 *   rateError: Error | null,
 *   ready: boolean,
 * }}
 */
export function useWarehouseSettings() {
  const [trackingThresholdUsd, setThreshold] = useState(DEFAULT_TRACKING_THRESHOLD_USD);
  const [inventoryCodeThresholdAmd, setCodeThreshold] = useState(
    DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
  );
  const [usdToAmd, setRate] = useState(DEFAULT_USD_TO_AMD);
  
  // Track errors separately for each subscription.
  // If warehouse settings subscription fails, thresholdError is set.
  // If exchange rates subscription fails, rateError is set.
  const [thresholdError, setThresholdError] = useState(/** @type {Error | null} */ (null));
  const [rateError, setRateError] = useState(/** @type {Error | null} */ (null));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gotThreshold = false;
    let gotRate = false;

    function markReady() {
      if (gotThreshold && gotRate) setReady(true);
    }

    const unsubA = subscribeWarehouseSettings(
      (s) => {
        setThreshold(s.trackingThresholdUsd);
        setCodeThreshold(s.inventoryCodeThresholdAmd);
        gotThreshold = true;
        markReady();
      },
      (err) => setThresholdError(err),
    );

    const unsubB = subscribeExchangeRates(
      (s) => {
        setRate(s.usdToAmd);
        gotRate = true;
        markReady();
      },
      (err) => setRateError(err),
    );

    return () => {
      unsubA();
      unsubB();
    };
  }, []);

  return {
    trackingThresholdUsd,
    inventoryCodeThresholdAmd,
    usdToAmd,
    thresholdError,
    rateError,
    ready,
  };
}
