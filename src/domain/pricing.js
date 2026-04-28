// src/domain/pricing.js
// Pure pricing helpers for the warehouse domain. NO Firebase. NO React.
//
// All currency conversion in the domain funnels through `convertToUsd`, and
// the tracking-classification rule is centralised in `isTracked`. The module
// is consumed by:
//   - the Firestore asset adapter (firebase-engineer): computes `priceUsd`
//     and the derived `isTracked` flag at write time, using the live
//     `usdToAmd` rate from `/settings/exchangeRates`.
//   - the Quick-Add Drawer (react-ui-engineer): suggests Tracked vs
//     Non-tracked mode from the price the user enters.
//
// The defaults exported below are *fallbacks* used when the corresponding
// Firestore settings document is missing. The plan's open question landed on
// 500 USD for the threshold default; super_admin can change it live via
// `/settings/warehouse.trackingThresholdUsd` without a migration.

/**
 * Default USD threshold above which a freshly-added asset is suggested as
 * "tracked" (single unit, requires serial number). Used when
 * `/settings/warehouse.trackingThresholdUsd` is missing.
 *
 * @type {500}
 */
export const DEFAULT_TRACKING_THRESHOLD_USD = 500;

/**
 * Default AMD threshold above which a `device` or `furniture` asset is
 * REQUIRED to carry an inventory code (sku). Used when
 * `/settings/warehouse.inventoryCodeThresholdAmd` is missing.
 *
 * Independent of `DEFAULT_TRACKING_THRESHOLD_USD` — the two rules answer
 * different questions:
 *   - `trackingThresholdUsd` → "is this serial-tracked?"
 *   - `inventoryCodeThresholdAmd` → "must this carry an inventory code?"
 *
 * @type {50000}
 */
export const DEFAULT_INVENTORY_CODE_THRESHOLD_AMD = 50000;

/**
 * Default conversion rate (1 USD = N AMD). Used when
 * `/settings/exchangeRates.usdToAmd` is missing.
 *
 * @type {390}
 */
export const DEFAULT_USD_TO_AMD = 390;

/**
 * Currencies the asset entry form is allowed to accept. Frozen so callers
 * cannot mutate the canonical list at runtime.
 *
 * @type {readonly ['USD', 'AMD']}
 */
export const SUPPORTED_CURRENCIES = Object.freeze(
  /** @type {readonly ['USD', 'AMD']} */ (['USD', 'AMD']),
);

/**
 * Convert a price in `currency` to its USD equivalent.
 *
 * Behaviour:
 *   - `amount === null` (or `undefined`) returns `null` — "no price entered yet".
 *   - `currency === 'USD'` returns `amount` unchanged (rate is ignored).
 *   - `currency === 'AMD'` returns `amount / usdToAmd`. The caller MUST pass a
 *     rate strictly greater than zero; non-positive rates throw rather than
 *     silently fall back, because a wrong rate would corrupt every persisted
 *     `priceUsd` and the wrong tracking classification downstream.
 *   - Any other currency throws — keeps `SUPPORTED_CURRENCIES` the single
 *     source of truth.
 *
 * @param {number | null | undefined} amount
 * @param {'USD' | 'AMD'} currency
 * @param {number} usdToAmd Must be > 0.
 * @returns {number | null}
 * @throws {Error} when `currency` is not in {@link SUPPORTED_CURRENCIES} or
 *   when `usdToAmd <= 0`.
 */
export function convertToUsd(amount, currency, usdToAmd) {
  if (amount === null || amount === undefined) return null;
  if (currency === 'USD') return amount;
  if (currency === 'AMD') {
    if (typeof usdToAmd !== 'number' || !(usdToAmd > 0)) {
      throw new Error(
        `convertToUsd: usdToAmd rate must be > 0, received ${usdToAmd}`,
      );
    }
    return amount / usdToAmd;
  }
  throw new Error(`convertToUsd: unsupported currency "${currency}"`);
}

/**
 * Decide whether an asset's USD price puts it into the "tracked" tier.
 *
 * Boundary is inclusive: `priceUsd === thresholdUsd` returns `true`. This
 * matches the user-facing copy ("$500 and above is tracked") and avoids the
 * off-by-one surprise where an exactly-at-threshold laptop slips into the
 * non-tracked batch.
 *
 * Defensive null handling:
 *   - `priceUsd == null` → `false`. The price is unknown so we cannot
 *     classify; the form should treat this as "no suggestion yet".
 *   - `thresholdUsd == null` → `false`. Without a threshold there is no
 *     decision to make, and we'd rather under-classify than throw deep
 *     inside a render path.
 *
 * @param {number | null | undefined} priceUsd
 * @param {number | null | undefined} thresholdUsd
 * @returns {boolean}
 */
export function isTracked(priceUsd, thresholdUsd) {
  if (priceUsd === null || priceUsd === undefined) return false;
  if (thresholdUsd === null || thresholdUsd === undefined) return false;
  return priceUsd >= thresholdUsd;
}

/**
 * Decide whether an inventory code (sku) is REQUIRED for a given asset.
 *
 * Rule (locked 2026-04-27):
 *   - Only `kind ∈ {device, furniture}` can ever be required to carry a code.
 *     `accessory` and `other` always return `false`.
 *   - The threshold is denominated in AMD, configurable via
 *     `/settings/warehouse.inventoryCodeThresholdAmd` (default 50000).
 *   - Comparison is **strictly greater than** the threshold ("превышает
 *     50,000"). A price exactly equal to the threshold does NOT require a
 *     code. Spec by user.
 *   - When `currency !== 'AMD'`, the price is converted to AMD via the
 *     supplied `usdToAmd` rate before comparison.
 *
 * Defensive null handling: if `price` is null/undefined the helper returns
 * `false` — the form should not flag a missing-price row as
 * code-required.
 *
 * @param {{
 *   kind: import('./categories').AssetKind | null | undefined,
 *   price: number | null | undefined,
 *   currency: 'USD' | 'AMD' | string,
 * }} input
 * @param {{
 *   thresholdAmd?: number | null,
 *   fxRate?: number | null,    Optional usdToAmd rate; required when currency !== 'AMD'.
 * }} [opts]
 * @returns {boolean}
 */
export function requiresInventoryCode(input, opts = {}) {
  if (!input) return false;
  const { kind, price, currency } = input;
  if (kind !== 'device' && kind !== 'furniture') return false;
  if (price === null || price === undefined) return false;
  if (typeof price !== 'number' || !isFinite(price)) return false;

  const thresholdAmd =
    typeof opts.thresholdAmd === 'number' && isFinite(opts.thresholdAmd) && opts.thresholdAmd > 0
      ? opts.thresholdAmd
      : DEFAULT_INVENTORY_CODE_THRESHOLD_AMD;

  let priceAmd;
  if (currency === 'AMD') {
    priceAmd = price;
  } else if (currency === 'USD') {
    const fx = opts.fxRate;
    if (typeof fx !== 'number' || !(fx > 0)) {
      // Without a usable FX rate we can't compare in AMD; fail open
      // (don't require a code) rather than throw inside the form's render.
      return false;
    }
    priceAmd = price * fx;
  } else {
    // Unsupported currency → don't claim the code is required.
    return false;
  }

  return priceAmd > thresholdAmd;
}
