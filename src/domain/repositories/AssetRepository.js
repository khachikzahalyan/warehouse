// AssetRepository — domain contract for reading and writing assets.
// Implemented by src/infra/repositories/firestoreAssetRepository.js (Iteration 1).
//
// The typedefs below are the *narrow* shape consumed by the React layer; the
// raw Firestore document may carry extra fields that the adapter strips.

import { APP_LOCALES, toAppLocale } from '../locales';

/** @typedef {import('../locales').AppLocale} AppLocale */

/**
 * Per-locale override map. All locale keys are optional — a missing or blank
 * value is treated as "no translation for this locale" by the display helper
 * in `src/utils/i18nAsset.js`.
 *
 * @typedef {Object} LocalizedText
 * @property {string} [hy]
 * @property {string} [en]
 * @property {string} [ru]
 */

/**
 * Snapshot of `/assets/{assetId}` projected for UI consumption. Timestamp
 * fields are already converted to plain `Date` objects by the adapter — the
 * Firestore `Timestamp` type does not leak past the infra layer.
 *
 * Fields that are NEVER translated in any locale:
 *   sku, brand, model, serialNumber, barcode, invoiceNumber, qrCodeId.
 *
 * Fields that ARE translatable per-asset via the *I18n maps:
 *   name (override via nameI18n), description (override via descriptionI18n).
 *
 * HolderType convention (agreed 2026-04-21):
 *   - `'user'`       — assigned to a person; `holderId` = user uid; `branchId`
 *                      still reflects where that user works.
 *   - `'department'` — assigned to a department as a whole.
 *   - `'storage'`    — physically in a branch but NOT assigned to any person.
 *                      Assets shown in the Branches section use this value
 *                      together with a non-null `branchId`. There is NO
 *                      separate `'branch'` holderType — we keep the enum small
 *                      and rely on `branchId` for the location axis.
 *
 * @typedef {Object} Asset
 * @property {string} id
 * @property {string} sku
 * @property {string} name                      Source-language display name, always present.
 * @property {string} description               Source-language description, may be ''.
 * @property {LocalizedText | null} nameI18n        Optional per-locale overrides for `name`.
 * @property {LocalizedText | null} descriptionI18n Optional per-locale overrides for `description`.
 * @property {AppLocale} sourceLanguage         Locale of `name` / `description`. Required on write; defaulted to 'hy' on read.
 * @property {'device' | 'furniture' | 'accessory' | 'other'} kind  Top-level taxonomy. Drives form behaviour, type list, and inventory-code requirement. Persisted as a string field on the doc.
 * @property {boolean} [needsReview]             True when migration could not confidently classify (legacy `vehicle`, missing category, low-confidence inference) OR when the user picked `kind: 'other'` from Quick-Add. Super_admin clears this on Edit.
 * @property {string} category                  Enum from `settings/global_lists.categories`. Label resolved via i18next.
 * @property {string} brand                     Never translated.
 * @property {string} model                     Never translated.
 * @property {string | null} serialNumber       Never translated.
 * @property {string | null} barcode            Never translated.
 * @property {string | null} qrCodeId           Never translated. Reserved; no UI in Iteration 1.
 * @property {string[]} tags
 * @property {string} branchId
 * @property {string | null} departmentId
 * @property {'user' | 'department' | 'storage'} holderType
 * @property {string} holderId
 * @property {{ type: 'user' | 'department' | 'storage', id: string, displayName: string }} holder
 * @property {number | null} purchasePrice
 * @property {string} currency
 * @property {number | null} priceUsd            Derived USD value computed at write time from `purchasePrice` + `currency` + the live `usdToAmd` rate (see `src/domain/pricing.js`). `null` when no price has been entered yet.
 * @property {number} quantity                   Integer ≥ 1. Always 1 for tracked assets; non-tracked batches may exceed 1.
 * @property {boolean} isTracked                 Derived flag: `priceUsd != null && priceUsd >= trackingThresholdUsd` at write time. Persisted (not recomputed on read) so historical classification survives threshold changes.
 * @property {Date | null} purchaseDate
 * @property {string | null} supplier
 * @property {string | null} invoiceNumber      Never translated.
 * @property {string | null} warrantyProvider
 * @property {Date | null} warrantyStart
 * @property {Date | null} warrantyEnd
 * @property {'active' | 'archived'} status
 * @property {'new' | 'good' | 'fair' | 'broken'} condition
 * @property {Date | null} acquiredAt
 * @property {Date | null} retiredAt
 * @property {string | null} pendingTransferId  Soft-lock set while a transfer is pending on this asset.
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {string} createdBy
 * @property {string} updatedBy
 */

/**
 * Narrow an unknown value to a LocalizedText | null. Empty-string locales
 * are dropped; if nothing non-empty remains, null is returned.
 *
 * Keep this in the domain layer so both the repository (on write) and the
 * reader (on snapshot) produce/consume the same shape.
 *
 * @param {unknown} value
 * @returns {LocalizedText | null}
 */
export function toLocalizedText(value) {
  if (!value || typeof value !== 'object') return null;
  /** @type {LocalizedText} */
  const out = {};
  const v = /** @type {Record<string, unknown>} */ (value);
  for (const locale of APP_LOCALES) {
    const raw = v[locale];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        out[/** @type {AppLocale} */ (locale)] = trimmed;
      }
    }
  }
  return Object.keys(out).length === 0 ? null : out;
}

/**
 * Re-export of toAppLocale for asset.sourceLanguage narrowing, so asset-side
 * call sites don't need a separate import from ../locales.
 * @param {unknown} value
 * @returns {AppLocale}
 */
export function toAssetSourceLanguage(value) {
  return toAppLocale(value);
}

/**
 * Filter shape accepted by AssetRepository.subscribeList. All fields are
 * optional; omitted filters mean "no constraint on this axis".
 *
 * @typedef {Object} AssetListFilter
 * @property {string} [branchId]
 * @property {string} [departmentId]
 * @property {string} [category]
 * @property {'user' | 'department' | 'storage'} [holderType]
 * @property {string} [holderId]
 * @property {'active' | 'archived'} [status]   Default filter is 'active' — callers that want archived rows must pass it explicitly.
 */

/**
 * Input for creating a new asset. Matches the fields a create form needs to
 * collect; server-side metadata (createdAt/updatedAt/createdBy/updatedBy,
 * id) is filled by the repository.
 *
 * @typedef {Object} AssetCreateInput
 * @property {string} sku
 * @property {string} name
 * @property {string} [description]
 * @property {LocalizedText | null} [nameI18n]
 * @property {LocalizedText | null} [descriptionI18n]
 * @property {AppLocale} sourceLanguage
 * @property {'device' | 'furniture' | 'accessory' | 'other'} [kind]  Top-level kind. When omitted, the repo defaults to `'other'` and sets `needsReview: true` so the row surfaces in the super_admin review queue.
 * @property {boolean} [needsReview]                                  Optional override; the repo defaults this from `kind` (true when kind === 'other').
 * @property {string} category
 * @property {string} brand
 * @property {string} model
 * @property {string | null} [serialNumber]
 * @property {string | null} [barcode]
 * @property {string | null} [qrCodeId]
 * @property {string[]} [tags]
 * @property {string} branchId
 * @property {string | null} [departmentId]
 * @property {'user' | 'department' | 'storage'} holderType
 * @property {string} holderId
 * @property {string} holderDisplayName
 * @property {number | null} [purchasePrice]
 * @property {string} [currency]
 * @property {number} [quantity]                 Integer ≥ 1. Defaults to 1 when omitted; the repository enforces 1 for tracked assets.
 * @property {boolean} [isTracked]               Optional override; when omitted the repository derives it from `priceUsd` (computed from `purchasePrice` + `currency`) versus the active `trackingThresholdUsd`.
 * @property {Date | null} [purchaseDate]
 * @property {string | null} [supplier]
 * @property {string | null} [invoiceNumber]
 * @property {string | null} [warrantyProvider]
 * @property {Date | null} [warrantyStart]
 * @property {Date | null} [warrantyEnd]
 * @property {'new' | 'good' | 'fair' | 'broken'} [condition]
 * @property {Date | null} [acquiredAt]
 */

/**
 * History event projected to the UI.
 *
 * @typedef {Object} AssetHistoryEvent
 * @property {string} id
 * @property {'created' | 'updated' | 'transferred' | 'archived' | 'unarchived'} eventType
 * @property {Date} at
 * @property {string} by
 * @property {Record<string, { from: unknown, to: unknown }>} [diff]
 * @property {string | null} [transferId]
 * @property {string | null} [note]
 */

/**
 * Repository contract. Infra adapters implement this shape; components and
 * hooks depend on this interface only, never on Firestore directly.
 *
 * Options accepted by subscribeStorage.
 *
 * @typedef {Object} SubscribeStorageOpts
 * @property {string} [branchId]  When present, only assets for that branch are returned.
 * @property {number} [limit]     Maximum rows returned; defaults to 200.
 */

/**
 * Uniqueness check result returned by isSkuUnique / isBarcodeUnique / isSerialUnique.
 *
 * @typedef {Object} UniqueCheckResult
 * @property {boolean} unique
 * @property {string | null} conflictId    id of the conflicting asset, or null when unique.
 * @property {string | null} conflictName  name of the conflicting asset, or null when unique.
 */

/**
 * @typedef {Object} AssetRepository
 * @property {(filter: AssetListFilter, onChange: (assets: Asset[]) => void, onError: (err: Error) => void) => () => void} subscribeList
 * @property {(id: string, onChange: (asset: Asset | null) => void, onError: (err: Error) => void) => () => void} subscribeOne
 * @property {(assetId: string, onChange: (events: AssetHistoryEvent[]) => void, onError: (err: Error) => void) => () => void} subscribeHistory
 * @property {(opts: SubscribeStorageOpts, onChange: (assets: Asset[]) => void, onError: (err: Error) => void) => () => void} subscribeStorage  Live list of assets where holderType === 'storage', ordered by createdAt desc.
 * @property {(input: AssetCreateInput) => Promise<string>} create  Validates uniqueness, derives priceUsd + isTracked, enforces quantity=1 for tracked assets, writes to Firestore, returns new document id.
 * @property {(id: string) => Promise<Asset | null>} getById
 * @property {(id: string, patch: Partial<AssetCreateInput>) => Promise<void>} update
 * @property {(id: string) => Promise<void>} archive
 * @property {(sku: string, exceptId?: string) => Promise<UniqueCheckResult>} isSkuUnique
 * @property {(barcode: string, exceptId?: string) => Promise<UniqueCheckResult>} isBarcodeUnique
 * @property {(serialNumber: string, exceptId?: string) => Promise<UniqueCheckResult>} isSerialUnique
 */

export {};
