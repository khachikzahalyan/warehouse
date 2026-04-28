// src/domain/settingsKeys.js
// Firestore path constants and JSDoc typedefs for settings documents.
// Pure module — no Firebase imports.

/**
 * Firestore document path for warehouse operational settings.
 * Shape: WarehouseSettings (see typedef below).
 */
export const SETTINGS_WAREHOUSE_DOC = 'settings/warehouse';

/**
 * Firestore document path for exchange-rate settings.
 * Shape: ExchangeRates.
 */
export const SETTINGS_EXCHANGE_RATES_DOC = 'settings/exchangeRates';

/**
 * Field name on the warehouse settings doc that stores the AMD threshold
 * above which `kind ∈ {device, furniture}` requires an inventory code.
 *
 * Centralised so the settings UI, repo adapter, and migration script all
 * agree on a single string. Default value is exported from
 * `src/domain/pricing.js` as `DEFAULT_INVENTORY_CODE_THRESHOLD_AMD`.
 */
export const INVENTORY_CODE_THRESHOLD_AMD = 'inventoryCodeThresholdAmd';

/**
 * Field name on the warehouse settings doc that stores the USD threshold
 * above which an asset is suggested to be serial-tracked. Kept in lockstep
 * with `INVENTORY_CODE_THRESHOLD_AMD` for symmetry.
 */
export const TRACKING_THRESHOLD_USD = 'trackingThresholdUsd';

/**
 * @typedef {Object} WarehouseSettings
 * @property {number} trackingThresholdUsd       USD price at or above which an asset is classified as tracked.
 * @property {number} inventoryCodeThresholdAmd  AMD price ABOVE which a device/furniture asset requires an inventory code.
 */

/**
 * @typedef {Object} ExchangeRates
 * @property {number} usdToAmd  How many AMD equal one USD.
 */
