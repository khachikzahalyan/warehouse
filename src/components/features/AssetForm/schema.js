// Pure validation for the Quick-Add form. Returns i18n key strings (not
// localized text) for each error so the UI can map with t().

import { LEGACY_ASSET_KINDS } from '../../../domain/categories';
import { requiresInventoryCode } from '../../../domain/pricing';

/**
 * @typedef {'device' | 'furniture' | 'accessory' | 'other'} AssetKind
 *
 * @typedef {Object} QuickAddForm
 * @property {AssetKind | null} kind
 * @property {boolean | null} hasCode
 * @property {string} name
 * @property {string} category
 * @property {string} model
 * @property {string} code
 * @property {'new' | 'used' | ''} condition
 * @property {Date | null} warrantyStart
 * @property {Date | null} warrantyEnd
 * @property {number} quantity
 * @property {number | null} [price]              Optional — present when the form collects price.
 * @property {'AMD' | 'USD' | string} [currency]  Defaults to 'AMD' on normalized output.
 *
 * @typedef {Object} QuickAddSettings
 * @property {number} [inventoryCodeThresholdAmd]
 * @property {number} [usdToAmd]
 *
 * @typedef {Object} QuickAddNormalized
 * @property {AssetKind} kind
 * @property {boolean} hasCode
 * @property {string} name
 * @property {string} category
 * @property {string} model
 * @property {string} code
 * @property {string} condition
 * @property {Date | null} warrantyStart
 * @property {Date | null} warrantyEnd
 * @property {number} quantity
 * @property {number | null} price
 * @property {'AMD' | 'USD'} currency
 * @property {boolean} needsReview
 *
 * @typedef {Object} QuickAddValidationResult
 * @property {boolean} ok
 * @property {Record<string, string>} errors
 * @property {QuickAddNormalized | null} normalized
 * @property {boolean} codeRequired                  True when the price-threshold rule says the inventory code is required.
 */

// Accept all legacy kinds so existing 'other' docs still validate when the
// user re-saves them via the (locked) edit form.
const VALID_KINDS = new Set(LEGACY_ASSET_KINDS);

/**
 * @param {QuickAddForm} form
 * @param {QuickAddSettings} [settings]
 * @returns {QuickAddValidationResult}
 */
export function validateQuickAdd(form, settings = {}) {
  /** @type {Record<string, string>} */
  const errors = {};

  // Kind is the first thing the user picks. Without it we can't decide
  // anything else.
  if (!form.kind || !VALID_KINDS.has(form.kind)) {
    errors.kind = 'kindRequired';
    return { ok: false, errors, normalized: null, codeRequired: false };
  }

  const kind = form.kind;
  const isAccessory = kind === 'accessory';

  // Accessories never have an inventory code; the form forces hasCode=false.
  const effectiveHasCode = isAccessory ? false : form.hasCode;

  if (!isAccessory && (effectiveHasCode === null || effectiveHasCode === undefined)) {
    errors.hasCode = 'required';
    return { ok: false, errors, normalized: null, codeRequired: false };
  }

  // Threshold-driven inventory-code requirement (kind ∈ {device, furniture}
  // AND price > threshold). Coexists with the existing tracking rule —
  // they answer different questions.
  const codeRequired = requiresInventoryCode(
    {
      kind,
      price: typeof form.price === 'number' ? form.price : null,
      currency: form.currency || 'AMD',
    },
    {
      thresholdAmd: settings.inventoryCodeThresholdAmd,
      fxRate: settings.usdToAmd,
    },
  );

  if (!form.name || form.name.trim() === '') errors.name = 'required';
  if (!form.category) errors.category = 'required';
  if (!form.condition) errors.condition = 'required';

  if (form.condition === 'new' && form.warrantyStart && form.warrantyEnd) {
    const s = form.warrantyStart instanceof Date ? form.warrantyStart : new Date(form.warrantyStart);
    const e = form.warrantyEnd instanceof Date ? form.warrantyEnd : new Date(form.warrantyEnd);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      errors.warrantyEnd = 'required';
    } else if (e < s) {
      errors.warrantyEnd = 'warrantyEndBeforeStart';
    }
  }

  if (effectiveHasCode === true) {
    if (!form.model || form.model.trim() === '') errors.model = 'required';
    if (!form.code || form.code.trim() === '') errors.code = 'required';
  } else {
    // Non-tracked / accessory path → quantity required.
    if (!Number.isFinite(form.quantity) || form.quantity < 1) {
      errors.quantity = 'min1';
    }
  }

  // If the threshold rule applies, the user MUST be in tracked mode AND
  // supply a non-empty code. The Yes/No question is forced to Yes by the
  // form layer, but we double-check here so the schema rejects bad inputs
  // even if the form guard is bypassed.
  if (codeRequired) {
    if (effectiveHasCode !== true) {
      errors.hasCode = 'codeRequiredAboveThreshold';
    }
    if (!form.code || form.code.trim() === '') {
      errors.code = 'codeRequiredAboveThreshold';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, normalized: null, codeRequired };
  }

  const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);
  const warrantyStart = form.condition === 'new' ? toDate(form.warrantyStart) : null;
  const warrantyEnd = form.condition === 'new' ? toDate(form.warrantyEnd) : null;
  const currency = form.currency === 'USD' ? 'USD' : 'AMD';
  const price = typeof form.price === 'number' && isFinite(form.price) ? form.price : null;
  const needsReview = kind === 'other';

  if (effectiveHasCode === true) {
    return {
      ok: true,
      errors: {},
      codeRequired,
      normalized: {
        kind,
        hasCode: true,
        name: form.name.trim(),
        category: form.category,
        model: form.model.trim(),
        code: form.code.trim(),
        condition: form.condition,
        warrantyStart,
        warrantyEnd,
        quantity: 1,
        price,
        currency,
        needsReview,
      },
    };
  }

  return {
    ok: true,
    errors: {},
    codeRequired,
    normalized: {
      kind,
      hasCode: false,
      name: form.name.trim(),
      category: form.category,
      model: '',
      code: '',
      condition: form.condition,
      warrantyStart,
      warrantyEnd,
      quantity: Math.max(1, Math.floor(form.quantity)),
      price,
      currency,
      needsReview,
    },
  };
}
