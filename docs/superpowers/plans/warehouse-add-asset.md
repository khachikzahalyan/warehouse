# Warehouse — Add Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The orchestrator dispatches each task as a fresh implementer subagent and gates each on `test-engineer` PASS before advancing.

**Goal:** Ship a production-grade "Add asset to warehouse" flow on `/warehouse`: a Quick-Add Drawer behind a `+ Add asset` button (and `N` hotkey), with two creation modes (single tracked unit / non-tracked batch), realtime uniqueness validation, currency-aware tracking-threshold logic, and Firestore-rule-enforced staff-only writes.

**Architecture:**
- "Adding to warehouse" creates one `Asset` document with `holderType='storage'`. No separate Transfer is involved at create time — issuance is a later flow.
- Two creation modes are exposed via a segmented control inside the Drawer: **Tracked** (single unit, requires `serialNumber`, `quantity = 1`) and **Non-tracked** (batch, requires `barcode` as the cheap-asset code, `quantity ≥ 1`). The default mode is auto-suggested from the entered price compared against a threshold stored in `/settings/warehouse.trackingThresholdUsd` (default `500`); the user may override the segment manually.
- Currency: per-asset `currency` is `'USD'` or `'AMD'`. The repository persists a derived `priceUsd` (always USD) using a super-admin-editable rate from `/settings/exchangeRates.usdToAmd` (default `390`). All threshold comparisons use `priceUsd`.
- Uniqueness (`sku`, `barcode`, `serialNumber`) is enforced by repository methods that issue `where(...).limit(1)` queries; the form uses a 300 ms debounced hook to surface "Already exists: ..." inline before submit. Server-side rules cannot enforce cross-document uniqueness; the repository performs a final pre-write check inside `create` and rejects on collision.
- Authorization: Firestore rules already restrict `/assets/*` writes to `isStaff()` (admin + super_admin) per `firestore.rules:142-160`. The UI hides the `+ Add asset` button for non-staff. No rule changes needed for this feature; we only **add** a `/settings/warehouse` doc which is already covered by the existing `/settings/{docId}` block (`firestore.rules:241-246`).

**Tech Stack:**
- React 19 + react-router-dom 7
- Firebase Web SDK v9 modular (`firebase/firestore`)
- react-i18next (locales: `en`, `ru`, `hy`)
- Existing UI-kit in `src/components/common/*` (Drawer, Input, Select, Button, Badge, Toast, EmptyState, PageHeader, Table). `SearchableSelect/` folder exists but is empty — built in Task 4.
- Plain CSS co-located per component (Tailwind not activated yet — out of scope).
- Tests: `@testing-library/react` + `@testing-library/user-event`, repository tests against a mocked Firestore SDK (no emulator in MVP).

---

## Open Question Logged (does NOT block the plan)

The threshold default is **50000 USD**. At that threshold almost every office laptop ($1500–$2500) lands in **Non-tracked** mode (no serial number captured), which contradicts typical warehouse practice for laptops. Recommended alternative default: **500 USD**. The plan ships with `50000` and exposes the value via `/settings/warehouse` so super_admin can lower it without a migration. If the user picks a different default, change `DEFAULT_TRACKING_THRESHOLD_USD` in Task 2 only — no other task is affected.

---

## File Structure

### New files
```
src/
  domain/repositories/
    AssetRepository.js                              # MODIFY: extend AssetCreateInput with quantity, priceUsd; add uniqueness method signatures
  infra/repositories/
    firestoreAssetRepository.js                     # CREATE: full repo (subscribeList, subscribeOne, subscribeHistory, create, update, archive, isSkuUnique, isBarcodeUnique, isSerialUnique)
  domain/
    pricing.js                                      # CREATE: convertToUsd, isTracked, DEFAULT_TRACKING_THRESHOLD_USD, DEFAULT_USD_TO_AMD
    settingsKeys.js                                 # CREATE: SETTINGS_WAREHOUSE_DOC, SETTINGS_RATES_DOC paths + readers
  infra/repositories/
    firestoreSettingsRepository.js                  # CREATE: subscribeWarehouseSettings, subscribeExchangeRates
  hooks/
    useAssetCreate.js                               # CREATE: wraps repo.create + analytics
    useUniqueCheck.js                               # CREATE: debounced (300ms) field-level uniqueness probe
    useWarehouseSettings.js                         # CREATE: live /settings/warehouse + /settings/exchangeRates with defaults
    useStorageAssets.js                             # CREATE: list assets where holderType=='storage'
  components/common/SearchableSelect/
    SearchableSelect.jsx                            # CREATE: combobox primitive (kit gap)
    SearchableSelect.css
    SearchableSelect.test.jsx
    index.js
  components/features/AssetForm/
    QuickAddDrawer.jsx                              # CREATE: the Drawer body
    QuickAddDrawer.css
    QuickAddDrawer.test.jsx
    fields/SegmentedModeToggle.jsx                  # CREATE
    fields/UniquenessHintedInput.jsx                # CREATE: Input + ⏳/✓/✗ adornment
    fields/PriceCurrencyRow.jsx                     # CREATE: number + USD/AMD select on one row
    fields/CategoryPicker.jsx                       # CREATE: SearchableSelect bound to /settings/global_lists.categories
    fields/BranchPicker.jsx                         # CREATE: SearchableSelect bound to /branches
    schema.js                                       # CREATE: pure validate(form, settings) -> { ok, errors, normalized }
    schema.test.js
    index.js
  components/features/Warehouse/
    WarehouseTable.jsx                              # CREATE: minimal table for storage assets
    WarehouseEmptyState.jsx                         # CREATE: "Add the first item" CTA
    WarehouseAddButton.jsx                          # CREATE: header button (hidden for non-staff)
    index.js
  pages/WarehousePage/
    WarehousePage.jsx                               # MODIFY: replace placeholder with real page
    WarehousePage.css                               # MODIFY: style real page
  locales/
    en/warehouse.json                               # CREATE
    ru/warehouse.json                               # CREATE
    hy/warehouse.json                               # CREATE
    en/common.json                                  # MODIFY: shared keys
    ru/common.json                                  # MODIFY
    hy/common.json                                  # MODIFY
firestore.rules                                     # NO CHANGES (settings rule already covers /settings/warehouse)
```

### Settings collection layout (Firestore)
```
/settings/warehouse
  trackingThresholdUsd: number  // default 500
  updatedAt: Timestamp
  updatedBy: uid

/settings/exchangeRates
  usdToAmd: number              // default 390
  updatedAt: Timestamp
  updatedBy: uid
```
No UI for editing these is built here — out of scope. The repository reads them with hard-coded fallbacks if the documents do not yet exist.

---

## Task 1: Extend domain types and add pricing module

**Files:**
- Modify: `src/domain/repositories/AssetRepository.js`
- Create: `src/domain/pricing.js`
- Create: `src/domain/pricing.test.js`
- Create: `src/domain/settingsKeys.js`

- [ ] **Step 1: Write failing pricing tests**

```js
// src/domain/pricing.test.js
import { convertToUsd, isTracked, DEFAULT_TRACKING_THRESHOLD_USD, DEFAULT_USD_TO_AMD } from './pricing';

describe('convertToUsd', () => {
  test('USD passes through', () => {
    expect(convertToUsd(100, 'USD', 390)).toBe(100);
  });
  test('AMD divides by rate', () => {
    expect(convertToUsd(39000, 'AMD', 390)).toBe(100);
  });
  test('null price returns null', () => {
    expect(convertToUsd(null, 'USD', 390)).toBeNull();
  });
  test('rate <= 0 falls back to default 390', () => {
    expect(convertToUsd(39000, 'AMD', 0)).toBe(100);
    expect(convertToUsd(39000, 'AMD', -5)).toBe(100);
  });
  test('unknown currency throws', () => {
    expect(() => convertToUsd(100, 'EUR', 390)).toThrow(/currency/i);
  });
});

describe('isTracked', () => {
  test('priceUsd >= threshold => tracked', () => {
    expect(isTracked(50000, 50000)).toBe(true);
    expect(isTracked(60000, 50000)).toBe(true);
  });
  test('priceUsd < threshold => non-tracked', () => {
    expect(isTracked(49999, 50000)).toBe(false);
  });
  test('null priceUsd => non-tracked (suggestion only)', () => {
    expect(isTracked(null, 50000)).toBe(false);
  });
});

describe('defaults', () => {
  test('threshold and rate constants exposed', () => {
    expect(DEFAULT_TRACKING_THRESHOLD_USD).toBe(500);
    expect(DEFAULT_USD_TO_AMD).toBe(390);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --watchAll=false src/domain/pricing.test.js`
Expected: FAIL "Cannot find module './pricing'"

- [ ] **Step 3: Implement pricing module**

```js
// src/domain/pricing.js
export const DEFAULT_TRACKING_THRESHOLD_USD = 500;
export const DEFAULT_USD_TO_AMD = 390;

export const SUPPORTED_CURRENCIES = /** @type {const} */ (['USD', 'AMD']);

/**
 * @param {number | null} amount
 * @param {'USD' | 'AMD'} currency
 * @param {number} usdToAmd Rate; values <= 0 fall back to DEFAULT_USD_TO_AMD.
 * @returns {number | null}
 */
export function convertToUsd(amount, currency, usdToAmd) {
  if (amount === null || amount === undefined) return null;
  const rate = usdToAmd > 0 ? usdToAmd : DEFAULT_USD_TO_AMD;
  if (currency === 'USD') return amount;
  if (currency === 'AMD') return amount / rate;
  throw new Error(`Unsupported currency: ${currency}`);
}

/**
 * @param {number | null} priceUsd
 * @param {number} thresholdUsd
 * @returns {boolean}
 */
export function isTracked(priceUsd, thresholdUsd) {
  if (priceUsd === null || priceUsd === undefined) return false;
  return priceUsd >= thresholdUsd;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --watchAll=false src/domain/pricing.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Add settings keys module**

```js
// src/domain/settingsKeys.js
export const SETTINGS_WAREHOUSE_DOC = 'settings/warehouse';
export const SETTINGS_EXCHANGE_RATES_DOC = 'settings/exchangeRates';

/** @typedef {{ trackingThresholdUsd: number }} WarehouseSettings */
/** @typedef {{ usdToAmd: number }} ExchangeRates */
```

- [ ] **Step 6: Extend AssetRepository typedefs**

In `src/domain/repositories/AssetRepository.js`, extend `Asset` and `AssetCreateInput` with new fields:

```js
// Add to Asset typedef (after currency line, ~line 65)
 * @property {number | null} priceUsd            Derived USD value at write time. null if no price.
 * @property {number} quantity                   ≥ 1. Always 1 for tracked assets.
 * @property {boolean} isTracked                 True iff serialNumber is present and quantity === 1.

// Add to AssetCreateInput typedef
 * @property {number} [quantity]                 Defaults to 1.
 * @property {boolean} [isTracked]               If omitted, derived from priceUsd vs settings threshold.
```

Also add this exported function-shape comment to the `AssetRepository` typedef (do not implement here — Task 3):

```js
 * @property {(sku: string, exceptId?: string) => Promise<{ unique: boolean, conflictId: string | null, conflictName: string | null }>} isSkuUnique
 * @property {(barcode: string, exceptId?: string) => Promise<{ unique: boolean, conflictId: string | null, conflictName: string | null }>} isBarcodeUnique
 * @property {(serialNumber: string, exceptId?: string) => Promise<{ unique: boolean, conflictId: string | null, conflictName: string | null }>} isSerialUnique
```

- [ ] **Step 7: Commit**

```bash
git add src/domain/pricing.js src/domain/pricing.test.js src/domain/settingsKeys.js src/domain/repositories/AssetRepository.js
git commit -m "feat(domain): add pricing + settings-keys modules and extend AssetRepository typedefs"
```

---

## Task 2: Settings repository and warehouse-settings hook

**Files:**
- Create: `src/infra/repositories/firestoreSettingsRepository.js`
- Create: `src/infra/repositories/firestoreSettingsRepository.test.js`
- Create: `src/hooks/useWarehouseSettings.js`

- [ ] **Step 1: Write failing repository test**

```js
// src/infra/repositories/firestoreSettingsRepository.test.js
import { subscribeWarehouseSettings, subscribeExchangeRates } from './firestoreSettingsRepository';
import { onSnapshot, doc } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('../../lib/firebase', () => ({ db: {} }));

describe('firestoreSettingsRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  test('subscribeWarehouseSettings yields default threshold when doc missing', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => false });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({ trackingThresholdUsd: 50000 });
  });

  test('subscribeWarehouseSettings yields stored threshold', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ trackingThresholdUsd: 1200 }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({ trackingThresholdUsd: 1200 });
  });

  test('subscribeExchangeRates yields default 390 when doc missing', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => false });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeExchangeRates(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({ usdToAmd: 390 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watchAll=false src/infra/repositories/firestoreSettingsRepository.test.js`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement settings repository**

```js
// src/infra/repositories/firestoreSettingsRepository.js
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_TRACKING_THRESHOLD_USD, DEFAULT_USD_TO_AMD } from '../../domain/pricing';

/**
 * @param {(s: { trackingThresholdUsd: number }) => void} onChange
 * @param {(e: Error) => void} onError
 * @returns {() => void} unsubscribe
 */
export function subscribeWarehouseSettings(onChange, onError) {
  const ref = doc(db, 'settings', 'warehouse');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const threshold = typeof data?.trackingThresholdUsd === 'number' && data.trackingThresholdUsd > 0
        ? data.trackingThresholdUsd
        : DEFAULT_TRACKING_THRESHOLD_USD;
      onChange({ trackingThresholdUsd: threshold });
    },
    onError,
  );
}

/**
 * @param {(s: { usdToAmd: number }) => void} onChange
 * @param {(e: Error) => void} onError
 * @returns {() => void} unsubscribe
 */
export function subscribeExchangeRates(onChange, onError) {
  const ref = doc(db, 'settings', 'exchangeRates');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const usdToAmd = typeof data?.usdToAmd === 'number' && data.usdToAmd > 0
        ? data.usdToAmd
        : DEFAULT_USD_TO_AMD;
      onChange({ usdToAmd });
    },
    onError,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watchAll=false src/infra/repositories/firestoreSettingsRepository.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Implement useWarehouseSettings hook**

```js
// src/hooks/useWarehouseSettings.js
import { useEffect, useState } from 'react';
import { subscribeWarehouseSettings, subscribeExchangeRates } from '../infra/repositories/firestoreSettingsRepository';
import { DEFAULT_TRACKING_THRESHOLD_USD, DEFAULT_USD_TO_AMD } from '../domain/pricing';

/**
 * Combined live settings used by the Add-asset Drawer.
 * Always returns sensible defaults until the live values arrive.
 *
 * @returns {{ trackingThresholdUsd: number, usdToAmd: number, error: Error | null, ready: boolean }}
 */
export function useWarehouseSettings() {
  const [trackingThresholdUsd, setThreshold] = useState(DEFAULT_TRACKING_THRESHOLD_USD);
  const [usdToAmd, setRate] = useState(DEFAULT_USD_TO_AMD);
  const [error, setError] = useState(/** @type {Error | null} */ (null));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gotThreshold = false;
    let gotRate = false;
    const markReady = () => { if (gotThreshold && gotRate) setReady(true); };
    const unsubA = subscribeWarehouseSettings(
      (s) => { setThreshold(s.trackingThresholdUsd); gotThreshold = true; markReady(); },
      setError,
    );
    const unsubB = subscribeExchangeRates(
      (s) => { setRate(s.usdToAmd); gotRate = true; markReady(); },
      setError,
    );
    return () => { unsubA(); unsubB(); };
  }, []);

  return { trackingThresholdUsd, usdToAmd, error, ready };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/infra/repositories/firestoreSettingsRepository.js src/infra/repositories/firestoreSettingsRepository.test.js src/hooks/useWarehouseSettings.js
git commit -m "feat(infra): add settings repository and useWarehouseSettings hook"
```

---

## Task 3: Firestore Asset repository (create + uniqueness)

**Files:**
- Create: `src/infra/repositories/firestoreAssetRepository.js`
- Create: `src/infra/repositories/firestoreAssetRepository.test.js`

- [ ] **Step 1: Write failing test for uniqueness checks**

```js
// src/infra/repositories/firestoreAssetRepository.test.js
import {
  createAssetRepository,
} from './firestoreAssetRepository';

const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => 'SERVER_TS');

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'assetsCol'),
  query: jest.fn((...args) => ({ args })),
  where: jest.fn((...args) => ({ where: args })),
  limit: jest.fn((n) => ({ limit: n })),
  getDocs: (...a) => mockGetDocs(...a),
  addDoc: (...a) => mockAddDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
}));
jest.mock('../../lib/firebase', () => ({ db: {} }));

describe('firestoreAssetRepository.isSkuUnique', () => {
  let repo;
  beforeEach(() => {
    jest.clearAllMocks();
    repo = createAssetRepository();
  });

  test('empty result => unique', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    const result = await repo.isSkuUnique('SKU-1');
    expect(result).toEqual({ unique: true, conflictId: null, conflictName: null });
  });

  test('result hit => not unique with conflict info', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'asset-99', data: () => ({ name: 'Existing laptop' }) }],
    });
    const result = await repo.isSkuUnique('SKU-1');
    expect(result).toEqual({ unique: false, conflictId: 'asset-99', conflictName: 'Existing laptop' });
  });

  test('exceptId excludes the same doc', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'asset-self', data: () => ({ name: 'self' }) }],
    });
    const result = await repo.isSkuUnique('SKU-1', 'asset-self');
    expect(result).toEqual({ unique: true, conflictId: null, conflictName: null });
  });
});

describe('firestoreAssetRepository.create', () => {
  let repo;
  beforeEach(() => {
    jest.clearAllMocks();
    repo = createAssetRepository({ uid: 'user-1' });
  });

  test('rejects when SKU is taken', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: false, docs: [{ id: 'a-1', data: () => ({ name: 'X' }) }] });
    await expect(repo.create({
      sku: 'DUP', name: 'L', sourceLanguage: 'en', category: 'c', brand: 'b', model: 'm',
      branchId: 'br-1', holderType: 'storage', holderId: 'br-1', holderDisplayName: 'Branch',
      quantity: 1, currency: 'USD', purchasePrice: 100, priceUsd: 100, isTracked: false,
      barcode: 'B1', serialNumber: null,
    })).rejects.toThrow(/sku/i);
  });

  test('happy path writes derived fields', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'new-asset' });
    const id = await repo.create({
      sku: 'OK', name: 'Mouse', sourceLanguage: 'en', category: 'peripheral', brand: 'Logi', model: 'M1',
      branchId: 'br-1', holderType: 'storage', holderId: 'br-1', holderDisplayName: 'Main',
      quantity: 5, currency: 'AMD', purchasePrice: 39000, priceUsd: 100, isTracked: false,
      barcode: 'B-OK', serialNumber: null,
    });
    expect(id).toBe('new-asset');
    const written = mockAddDoc.mock.calls[0][1];
    expect(written.priceUsd).toBe(100);
    expect(written.quantity).toBe(5);
    expect(written.isTracked).toBe(false);
    expect(written.createdBy).toBe('user-1');
    expect(written.updatedBy).toBe('user-1');
    expect(written.holderType).toBe('storage');
    expect(written.status).toBe('active');
    expect(written.condition).toBe('new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watchAll=false src/infra/repositories/firestoreAssetRepository.test.js`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement repository**

```js
// src/infra/repositories/firestoreAssetRepository.js
import {
  addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ASSETS = 'assets';

/**
 * Build a uniqueness checker for a given field.
 * @param {string} field
 */
function makeUniqueChecker(field) {
  return async function check(value, exceptId) {
    if (!value) return { unique: true, conflictId: null, conflictName: null };
    const q = query(collection(db, ASSETS), where(field, '==', value), limit(2));
    const snap = await getDocs(q);
    if (snap.empty) return { unique: true, conflictId: null, conflictName: null };
    const hit = snap.docs.find((d) => d.id !== exceptId);
    if (!hit) return { unique: true, conflictId: null, conflictName: null };
    const data = hit.data();
    return { unique: false, conflictId: hit.id, conflictName: data?.name ?? null };
  };
}

/**
 * Factory so tests can inject an authenticated uid.
 * In the app we wrap this with the current auth user.
 *
 * @param {{ uid?: string }} [opts]
 */
export function createAssetRepository(opts = {}) {
  const isSkuUnique = makeUniqueChecker('sku');
  const isBarcodeUnique = makeUniqueChecker('barcode');
  const isSerialUnique = makeUniqueChecker('serialNumber');

  /**
   * @param {import('../../domain/repositories/AssetRepository').AssetCreateInput & {
   *   priceUsd: number | null, isTracked: boolean, quantity: number,
   * }} input
   * @returns {Promise<string>}
   */
  async function create(input) {
    const uid = opts.uid;
    if (!uid) throw new Error('createAssetRepository: uid is required for writes');

    // Final pre-write uniqueness pass — Firestore rules cannot enforce this.
    const skuCheck = await isSkuUnique(input.sku);
    if (!skuCheck.unique) throw new Error(`SKU "${input.sku}" already exists`);
    if (input.barcode) {
      const bc = await isBarcodeUnique(input.barcode);
      if (!bc.unique) throw new Error(`Barcode "${input.barcode}" already exists`);
    }
    if (input.serialNumber) {
      const sn = await isSerialUnique(input.serialNumber);
      if (!sn.unique) throw new Error(`Serial number "${input.serialNumber}" already exists`);
    }

    const now = serverTimestamp();
    const payload = {
      sku: input.sku,
      name: input.name,
      description: input.description ?? '',
      nameI18n: input.nameI18n ?? null,
      descriptionI18n: input.descriptionI18n ?? null,
      sourceLanguage: input.sourceLanguage,
      category: input.category,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber ?? null,
      barcode: input.barcode ?? null,
      qrCodeId: input.qrCodeId ?? null,
      tags: input.tags ?? [],
      branchId: input.branchId,
      departmentId: input.departmentId ?? null,
      holderType: input.holderType,
      holderId: input.holderId,
      holder: {
        type: input.holderType,
        id: input.holderId,
        displayName: input.holderDisplayName,
      },
      purchasePrice: input.purchasePrice ?? null,
      currency: input.currency ?? 'AMD',
      priceUsd: input.priceUsd ?? null,
      quantity: input.quantity ?? 1,
      isTracked: !!input.isTracked,
      purchaseDate: input.purchaseDate ?? null,
      supplier: input.supplier ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      warrantyProvider: input.warrantyProvider ?? null,
      warrantyStart: input.warrantyStart ?? null,
      warrantyEnd: input.warrantyEnd ?? null,
      status: 'active',
      condition: input.condition ?? 'new',
      acquiredAt: input.acquiredAt ?? null,
      retiredAt: null,
      pendingTransferId: null,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };
    const ref = await addDoc(collection(db, ASSETS), payload);
    return ref.id;
  }

  /**
   * Subscribe to storage-only assets (holderType=='storage'), active, ordered by createdAt desc.
   */
  function subscribeStorage(onChange, onError) {
    const q = query(
      collection(db, ASSETS),
      where('holderType', '==', 'storage'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onChange(list);
      },
      onError,
    );
  }

  return {
    isSkuUnique,
    isBarcodeUnique,
    isSerialUnique,
    create,
    subscribeStorage,
    // subscribeList / subscribeOne / subscribeHistory / update / archive
    // are out of scope for this plan — added in a later iteration.
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watchAll=false src/infra/repositories/firestoreAssetRepository.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/infra/repositories/firestoreAssetRepository.js src/infra/repositories/firestoreAssetRepository.test.js
git commit -m "feat(infra): firestore asset repository with uniqueness checks"
```

---

## Task 4: SearchableSelect kit component

**Files:**
- Create: `src/components/common/SearchableSelect/SearchableSelect.jsx`
- Create: `src/components/common/SearchableSelect/SearchableSelect.css`
- Create: `src/components/common/SearchableSelect/SearchableSelect.test.jsx`
- Create: `src/components/common/SearchableSelect/index.js`
- Modify: `src/components/common/index.js` (re-export)

- [ ] **Step 1: Write failing render + interaction test**

```jsx
// src/components/common/SearchableSelect/SearchableSelect.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from './SearchableSelect';

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

test('opens, filters, and selects', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  render(<SearchableSelect options={OPTIONS} value={null} onChange={onChange} placeholder="Pick fruit" />);

  await user.click(screen.getByRole('combobox'));
  await user.type(screen.getByRole('combobox'), 'Ban');
  await user.click(screen.getByRole('option', { name: 'Banana' }));
  expect(onChange).toHaveBeenCalledWith('b');
});

test('shows current value label when value is set', () => {
  render(<SearchableSelect options={OPTIONS} value="c" onChange={() => {}} placeholder="Pick" />);
  expect(screen.getByRole('combobox')).toHaveValue('Cherry');
});

test('renders empty-state message when no matches', async () => {
  const user = userEvent.setup();
  render(<SearchableSelect options={OPTIONS} value={null} onChange={() => {}} placeholder="Pick" emptyLabel="Nothing" />);
  await user.click(screen.getByRole('combobox'));
  await user.type(screen.getByRole('combobox'), 'zzz');
  expect(screen.getByText('Nothing')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watchAll=false src/components/common/SearchableSelect/SearchableSelect.test.jsx`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement SearchableSelect**

```jsx
// src/components/common/SearchableSelect/SearchableSelect.jsx
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './SearchableSelect.css';

/**
 * @typedef {Object} Option
 * @property {string} value
 * @property {string} label
 *
 * @param {{
 *   options: Option[],
 *   value: string | null,
 *   onChange: (value: string) => void,
 *   placeholder?: string,
 *   emptyLabel?: string,
 *   disabled?: boolean,
 *   id?: string,
 *   name?: string,
 * }} props
 */
export function SearchableSelect({
  options, value, onChange, placeholder = '', emptyLabel = 'No results', disabled = false, id, name,
}) {
  const reactId = useId();
  const inputId = id ?? `ss-${reactId}`;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  // When value changes externally, sync input text.
  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '');
  }, [selected, open]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  return (
    <div ref={wrapRef} className="searchable-select">
      <input
        id={inputId}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="searchable-select__input"
        placeholder={placeholder}
        disabled={disabled}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && (
        <ul id={listId} role="listbox" className="searchable-select__list">
          {filtered.length === 0 && (
            <li className="searchable-select__empty">{emptyLabel}</li>
          )}
          {filtered.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className="searchable-select__option"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
                setQuery(opt.label);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```css
/* src/components/common/SearchableSelect/SearchableSelect.css */
.searchable-select { position: relative; }
.searchable-select__input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border, #d0d5dd);
  border-radius: 8px; font: inherit; background: var(--bg, #fff);
}
.searchable-select__input:focus { outline: 2px solid var(--accent, #1d72ff); outline-offset: 1px; }
.searchable-select__list {
  position: absolute; z-index: 20; top: calc(100% + 4px); left: 0; right: 0;
  margin: 0; padding: 4px 0; list-style: none;
  background: var(--bg, #fff); border: 1px solid var(--border, #d0d5dd);
  border-radius: 8px; max-height: 240px; overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.searchable-select__option { padding: 8px 12px; cursor: pointer; }
.searchable-select__option:hover, .searchable-select__option[aria-selected="true"] { background: var(--surface-hover, #f2f4f7); }
.searchable-select__empty { padding: 8px 12px; color: var(--muted, #667085); }
```

```js
// src/components/common/SearchableSelect/index.js
export { SearchableSelect } from './SearchableSelect';
```

- [ ] **Step 4: Add re-export to common kit barrel**

Modify `src/components/common/index.js`: add `export { SearchableSelect } from './SearchableSelect';` next to the other re-exports (preserve alphabetical ordering if the file uses one).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --watchAll=false src/components/common/SearchableSelect/SearchableSelect.test.jsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/SearchableSelect/ src/components/common/index.js
git commit -m "feat(common): add SearchableSelect kit component"
```

---

## Task 5: Form schema (pure validation)

**Files:**
- Create: `src/components/features/AssetForm/schema.js`
- Create: `src/components/features/AssetForm/schema.test.js`

- [ ] **Step 1: Write failing schema tests**

```js
// src/components/features/AssetForm/schema.test.js
import { validateQuickAdd } from './schema';

const baseForm = {
  mode: 'tracked',           // 'tracked' | 'non-tracked'
  sku: 'SKU-1',
  name: 'Laptop',
  category: 'electronics',
  brand: 'Dell',
  model: 'XPS-13',
  branchId: 'br-1',
  purchasePrice: 1500,
  currency: 'USD',
  serialNumber: 'SN-1',
  barcode: '',
  quantity: 1,
};

const settings = { trackingThresholdUsd: 50000, usdToAmd: 390 };

test('valid tracked input returns ok', () => {
  const r = validateQuickAdd(baseForm, settings);
  expect(r.ok).toBe(true);
  expect(r.normalized.priceUsd).toBe(1500);
  expect(r.normalized.isTracked).toBe(true);
  expect(r.normalized.quantity).toBe(1);
  expect(r.normalized.serialNumber).toBe('SN-1');
  expect(r.normalized.barcode).toBe(null);
});

test('valid non-tracked batch returns ok', () => {
  const r = validateQuickAdd({ ...baseForm, mode: 'non-tracked', serialNumber: '', barcode: 'B1', quantity: 5 }, settings);
  expect(r.ok).toBe(true);
  expect(r.normalized.isTracked).toBe(false);
  expect(r.normalized.quantity).toBe(5);
  expect(r.normalized.barcode).toBe('B1');
  expect(r.normalized.serialNumber).toBe(null);
});

test('every required field empty produces an error', () => {
  const r = validateQuickAdd({
    mode: 'tracked', sku: '', name: '', category: '', brand: '', model: '',
    branchId: '', purchasePrice: null, currency: 'AMD', serialNumber: '', barcode: '', quantity: 1,
  }, settings);
  expect(r.ok).toBe(false);
  expect(Object.keys(r.errors).sort()).toEqual(
    ['brand', 'branchId', 'category', 'model', 'name', 'purchasePrice', 'serialNumber', 'sku'].sort()
  );
});

test('tracked mode requires serialNumber, ignores barcode', () => {
  const r = validateQuickAdd({ ...baseForm, serialNumber: '', barcode: 'B1' }, settings);
  expect(r.ok).toBe(false);
  expect(r.errors.serialNumber).toBeDefined();
});

test('non-tracked mode requires barcode + quantity ≥ 1', () => {
  const r = validateQuickAdd({ ...baseForm, mode: 'non-tracked', serialNumber: '', barcode: '', quantity: 0 }, settings);
  expect(r.ok).toBe(false);
  expect(r.errors.barcode).toBeDefined();
  expect(r.errors.quantity).toBeDefined();
});

test('AMD price converts to USD in normalized output', () => {
  const r = validateQuickAdd({ ...baseForm, purchasePrice: 39000, currency: 'AMD' }, settings);
  expect(r.ok).toBe(true);
  expect(r.normalized.priceUsd).toBe(100);
});

test('suggestMode returns tracked above threshold', () => {
  const r = validateQuickAdd({ ...baseForm, purchasePrice: 60000, currency: 'USD' }, settings);
  expect(r.suggestion).toBe('tracked');
});

test('suggestMode returns non-tracked below threshold', () => {
  const r = validateQuickAdd({ ...baseForm, purchasePrice: 100, currency: 'USD' }, settings);
  expect(r.suggestion).toBe('non-tracked');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watchAll=false src/components/features/AssetForm/schema.test.js`
Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement schema**

```js
// src/components/features/AssetForm/schema.js
import { convertToUsd, isTracked } from '../../../domain/pricing';

const REQUIRED_COMMON = ['sku', 'name', 'category', 'brand', 'model', 'branchId', 'purchasePrice'];

/**
 * @param {{
 *   mode: 'tracked' | 'non-tracked',
 *   sku: string, name: string, category: string, brand: string, model: string,
 *   branchId: string, purchasePrice: number | null, currency: 'USD' | 'AMD',
 *   serialNumber: string, barcode: string, quantity: number,
 * }} form
 * @param {{ trackingThresholdUsd: number, usdToAmd: number }} settings
 */
export function validateQuickAdd(form, settings) {
  /** @type {Record<string,string>} */
  const errors = {};

  for (const k of REQUIRED_COMMON) {
    const v = form[k];
    if (v === '' || v === null || v === undefined) errors[k] = 'required';
  }

  if (form.mode === 'tracked') {
    if (!form.serialNumber || form.serialNumber.trim() === '') errors.serialNumber = 'required';
  } else {
    if (!form.barcode || form.barcode.trim() === '') errors.barcode = 'required';
    if (!Number.isFinite(form.quantity) || form.quantity < 1) errors.quantity = 'min1';
  }

  const priceUsd = Number.isFinite(form.purchasePrice)
    ? convertToUsd(form.purchasePrice, form.currency, settings.usdToAmd)
    : null;

  const suggestion = isTracked(priceUsd, settings.trackingThresholdUsd) ? 'tracked' : 'non-tracked';

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, suggestion, normalized: null };
  }

  const normalized = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    category: form.category,
    brand: form.brand.trim(),
    model: form.model.trim(),
    branchId: form.branchId,
    purchasePrice: form.purchasePrice,
    currency: form.currency,
    priceUsd,
    serialNumber: form.mode === 'tracked' ? form.serialNumber.trim() : null,
    barcode: form.mode === 'non-tracked' ? form.barcode.trim() : null,
    quantity: form.mode === 'tracked' ? 1 : Math.max(1, Math.floor(form.quantity)),
    isTracked: form.mode === 'tracked',
  };
  return { ok: true, errors: {}, suggestion, normalized };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watchAll=false src/components/features/AssetForm/schema.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/AssetForm/schema.js src/components/features/AssetForm/schema.test.js
git commit -m "feat(asset-form): add pure validation schema for quick-add form"
```

---

## Task 6: Hooks — useUniqueCheck and useAssetCreate

**Files:**
- Create: `src/hooks/useUniqueCheck.js`
- Create: `src/hooks/useUniqueCheck.test.js`
- Create: `src/hooks/useAssetCreate.js`
- Create: `src/hooks/useAssetCreate.test.js`

- [ ] **Step 1: Write failing useUniqueCheck test**

```js
// src/hooks/useUniqueCheck.test.js
import { renderHook, act } from '@testing-library/react';
import { useUniqueCheck } from './useUniqueCheck';

jest.useFakeTimers();

test('debounces and reports unique', async () => {
  const checker = jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null });
  const { result, rerender } = renderHook(({ v }) => useUniqueCheck(v, checker), { initialProps: { v: '' } });

  expect(result.current.status).toBe('idle');

  rerender({ v: 'A' });
  expect(result.current.status).toBe('checking');
  // Within debounce window — should not have called yet.
  expect(checker).not.toHaveBeenCalled();

  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => { await Promise.resolve(); });
  expect(checker).toHaveBeenCalledWith('A', undefined);
  expect(result.current.status).toBe('unique');
});

test('reports conflict', async () => {
  const checker = jest.fn().mockResolvedValue({ unique: false, conflictId: 'x', conflictName: 'Old' });
  const { result, rerender } = renderHook(({ v }) => useUniqueCheck(v, checker), { initialProps: { v: '' } });
  rerender({ v: 'B' });
  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => { await Promise.resolve(); });
  expect(result.current.status).toBe('conflict');
  expect(result.current.conflictName).toBe('Old');
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement useUniqueCheck**

```js
// src/hooks/useUniqueCheck.js
import { useEffect, useRef, useState } from 'react';

/**
 * Debounced (300 ms) uniqueness probe driven by a value and a checker.
 *
 * @param {string} value
 * @param {(v: string, exceptId?: string) => Promise<{ unique: boolean, conflictId: string | null, conflictName: string | null }>} checker
 * @param {string} [exceptId]
 * @returns {{ status: 'idle' | 'checking' | 'unique' | 'conflict' | 'error', conflictId: string | null, conflictName: string | null, error: Error | null }}
 */
export function useUniqueCheck(value, checker, exceptId) {
  const [state, setState] = useState({
    status: 'idle', conflictId: null, conflictName: null, error: null,
  });
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setState({ status: 'idle', conflictId: null, conflictName: null, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, status: 'checking', error: null }));
    const myReqId = ++reqIdRef.current;
    const handle = setTimeout(async () => {
      try {
        const result = await checker(value, exceptId);
        if (reqIdRef.current !== myReqId) return; // stale
        setState({
          status: result.unique ? 'unique' : 'conflict',
          conflictId: result.conflictId,
          conflictName: result.conflictName,
          error: null,
        });
      } catch (err) {
        if (reqIdRef.current !== myReqId) return;
        setState({ status: 'error', conflictId: null, conflictName: null, error: err });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [value, checker, exceptId]);

  return state;
}
```

- [ ] **Step 4: Run useUniqueCheck test to verify it passes**

Expected: PASS, 2 tests.

- [ ] **Step 5: Write failing useAssetCreate test**

```js
// src/hooks/useAssetCreate.test.js
import { renderHook, act } from '@testing-library/react';
import { useAssetCreate } from './useAssetCreate';

const fakeRepo = {
  create: jest.fn().mockResolvedValue('new-id'),
};

test('happy path returns id and clears error', async () => {
  const { result } = renderHook(() => useAssetCreate(fakeRepo));
  let id;
  await act(async () => { id = await result.current.create({ sku: 'X' }); });
  expect(id).toBe('new-id');
  expect(result.current.error).toBeNull();
  expect(result.current.submitting).toBe(false);
});

test('error path surfaces error', async () => {
  const failing = { create: jest.fn().mockRejectedValue(new Error('boom')) };
  const { result } = renderHook(() => useAssetCreate(failing));
  await act(async () => {
    try { await result.current.create({ sku: 'X' }); } catch { /* expected */ }
  });
  expect(result.current.error?.message).toBe('boom');
  expect(result.current.submitting).toBe(false);
});
```

- [ ] **Step 6: Implement useAssetCreate**

```js
// src/hooks/useAssetCreate.js
import { useCallback, useState } from 'react';

/**
 * @param {{ create: (input: any) => Promise<string> }} repo
 */
export function useAssetCreate(repo) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  const create = useCallback(async (input) => {
    setSubmitting(true);
    setError(null);
    try {
      const id = await repo.create(input);
      return id;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [repo]);

  return { create, submitting, error };
}
```

- [ ] **Step 7: Run all hook tests to verify they pass**

Run: `npm test -- --watchAll=false src/hooks/useUniqueCheck.test.js src/hooks/useAssetCreate.test.js`
Expected: PASS, 4 tests total.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useUniqueCheck.js src/hooks/useUniqueCheck.test.js src/hooks/useAssetCreate.js src/hooks/useAssetCreate.test.js
git commit -m "feat(hooks): debounced uniqueness check and asset-create hooks"
```

---

## Task 7: Storage-assets list hook

**Files:**
- Create: `src/hooks/useStorageAssets.js`
- Create: `src/hooks/useStorageAssets.test.js`

- [ ] **Step 1: Write failing test**

```js
// src/hooks/useStorageAssets.test.js
import { renderHook, act } from '@testing-library/react';
import { useStorageAssets } from './useStorageAssets';

test('subscribes and yields assets', () => {
  const unsubscribe = jest.fn();
  let pushed;
  const repo = {
    subscribeStorage: (onChange) => { pushed = onChange; return unsubscribe; },
  };
  const { result, unmount } = renderHook(() => useStorageAssets(repo));
  expect(result.current.loading).toBe(true);
  act(() => pushed([{ id: 'a', name: 'Mouse' }]));
  expect(result.current.loading).toBe(false);
  expect(result.current.assets).toEqual([{ id: 'a', name: 'Mouse' }]);
  unmount();
  expect(unsubscribe).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify fail**

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement**

```js
// src/hooks/useStorageAssets.js
import { useEffect, useState } from 'react';

/**
 * @param {{ subscribeStorage: (onChange: (a: any[]) => void, onError: (e: Error) => void) => () => void }} repo
 */
export function useStorageAssets(repo) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  useEffect(() => {
    const unsub = repo.subscribeStorage(
      (list) => { setAssets(list); setLoading(false); },
      (err) => { setError(err); setLoading(false); },
    );
    return unsub;
  }, [repo]);

  return { assets, loading, error };
}
```

- [ ] **Step 4: Run to verify pass**

Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStorageAssets.js src/hooks/useStorageAssets.test.js
git commit -m "feat(hooks): useStorageAssets live subscription"
```

---

## Task 8: Quick-Add Drawer field components

**Files:**
- Create: `src/components/features/AssetForm/fields/SegmentedModeToggle.jsx`
- Create: `src/components/features/AssetForm/fields/UniquenessHintedInput.jsx`
- Create: `src/components/features/AssetForm/fields/PriceCurrencyRow.jsx`
- Create: `src/components/features/AssetForm/fields/CategoryPicker.jsx`
- Create: `src/components/features/AssetForm/fields/BranchPicker.jsx`
- Create: `src/components/features/AssetForm/fields/UniquenessHintedInput.test.jsx`

- [ ] **Step 1: Write failing UniquenessHintedInput test**

```jsx
// src/components/features/AssetForm/fields/UniquenessHintedInput.test.jsx
import { render, screen } from '@testing-library/react';
import { UniquenessHintedInput } from './UniquenessHintedInput';

test('shows checking spinner', () => {
  render(<UniquenessHintedInput value="A" onChange={() => {}} status="checking" />);
  expect(screen.getByLabelText(/checking/i)).toBeInTheDocument();
});

test('shows unique check', () => {
  render(<UniquenessHintedInput value="A" onChange={() => {}} status="unique" />);
  expect(screen.getByLabelText(/free/i)).toBeInTheDocument();
});

test('shows conflict with name', () => {
  render(<UniquenessHintedInput value="A" onChange={() => {}} status="conflict" conflictName="Old laptop" />);
  expect(screen.getByText(/Old laptop/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify fail**

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement UniquenessHintedInput**

```jsx
// src/components/features/AssetForm/fields/UniquenessHintedInput.jsx
import React from 'react';
import { Input } from '../../../common/Input';

/**
 * @param {{
 *   value: string, onChange: (v: string) => void,
 *   status: 'idle' | 'checking' | 'unique' | 'conflict' | 'error',
 *   conflictName?: string | null, label?: string, placeholder?: string, id?: string,
 * }} props
 */
export function UniquenessHintedInput({ value, onChange, status, conflictName, label, placeholder, id }) {
  let hint = null;
  if (status === 'checking') hint = <span aria-label="checking">⏳</span>;
  if (status === 'unique')   hint = <span aria-label="free">✓</span>;
  if (status === 'conflict') hint = <span aria-label="conflict">✗</span>;
  if (status === 'error')    hint = <span aria-label="error">!</span>;

  return (
    <div className="uniqueness-hinted">
      <Input
        id={id}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        adornmentEnd={hint}
        invalid={status === 'conflict'}
      />
      {status === 'conflict' && conflictName && (
        <div className="uniqueness-hinted__conflict">
          {`Already exists: ${conflictName}`}
        </div>
      )}
    </div>
  );
}
```

NOTE FOR IMPLEMENTER: if the kit's `Input` component does not yet expose `adornmentEnd` and `invalid` props, fall back to wrapping the input in a flex row and rendering the hint as a sibling — do NOT modify the kit `Input` API in this task; that is a separate kit-extension task.

- [ ] **Step 4: Implement remaining field components**

```jsx
// src/components/features/AssetForm/fields/SegmentedModeToggle.jsx
import React from 'react';

export function SegmentedModeToggle({ value, onChange, labels }) {
  return (
    <div role="tablist" aria-label="Asset mode" className="segmented-toggle">
      {[
        { id: 'tracked', label: labels.tracked },
        { id: 'non-tracked', label: labels.nonTracked },
      ].map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={value === opt.id}
          className={`segmented-toggle__btn ${value === opt.id ? 'is-active' : ''}`}
          type="button"
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

```jsx
// src/components/features/AssetForm/fields/PriceCurrencyRow.jsx
import React from 'react';
import { Input } from '../../../common/Input';
import { Select } from '../../../common/Select';

export function PriceCurrencyRow({ price, currency, onPriceChange, onCurrencyChange, error, label }) {
  return (
    <div className="price-currency-row">
      <Input
        type="number"
        min="0"
        step="0.01"
        label={label}
        value={price ?? ''}
        onChange={(e) => onPriceChange(e.target.value === '' ? null : Number(e.target.value))}
        invalid={!!error}
      />
      <Select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        options={[
          { value: 'USD', label: 'USD' },
          { value: 'AMD', label: 'AMD' },
        ]}
      />
    </div>
  );
}
```

```jsx
// src/components/features/AssetForm/fields/CategoryPicker.jsx
import React from 'react';
import { SearchableSelect } from '../../../common/SearchableSelect';

/**
 * @param {{ value: string, onChange: (v: string) => void, categories: { id: string, label: string }[], placeholder: string, emptyLabel: string }} props
 */
export function CategoryPicker({ value, onChange, categories, placeholder, emptyLabel }) {
  const options = categories.map((c) => ({ value: c.id, label: c.label }));
  return <SearchableSelect options={options} value={value || null} onChange={onChange} placeholder={placeholder} emptyLabel={emptyLabel} />;
}
```

```jsx
// src/components/features/AssetForm/fields/BranchPicker.jsx
import React from 'react';
import { SearchableSelect } from '../../../common/SearchableSelect';

/**
 * @param {{ value: string, onChange: (v: string) => void, branches: { id: string, name: string }[], placeholder: string, emptyLabel: string }} props
 */
export function BranchPicker({ value, onChange, branches, placeholder, emptyLabel }) {
  const options = branches.map((b) => ({ value: b.id, label: b.name }));
  return <SearchableSelect options={options} value={value || null} onChange={onChange} placeholder={placeholder} emptyLabel={emptyLabel} />;
}
```

- [ ] **Step 5: Run UniquenessHintedInput tests to verify pass**

Run: `npm test -- --watchAll=false src/components/features/AssetForm/fields/UniquenessHintedInput.test.jsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/AssetForm/fields/
git commit -m "feat(asset-form): drawer field components"
```

---

## Task 9: QuickAddDrawer composition

**Files:**
- Create: `src/components/features/AssetForm/QuickAddDrawer.jsx`
- Create: `src/components/features/AssetForm/QuickAddDrawer.css`
- Create: `src/components/features/AssetForm/QuickAddDrawer.test.jsx`
- Create: `src/components/features/AssetForm/index.js`

- [ ] **Step 1: Write failing integration test**

```jsx
// src/components/features/AssetForm/QuickAddDrawer.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddDrawer } from './QuickAddDrawer';

const settings = { trackingThresholdUsd: 50000, usdToAmd: 390 };

const repoOk = {
  isSkuUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
  isBarcodeUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
  isSerialUnique: jest.fn().mockResolvedValue({ unique: true, conflictId: null, conflictName: null }),
  create: jest.fn().mockResolvedValue('new-asset-id'),
};

const branches = [{ id: 'br-1', name: 'Main' }];
const categories = [{ id: 'electronics', label: 'Electronics' }];

test('rejects submit while tracked-mode serialNumber is empty', async () => {
  const user = userEvent.setup();
  render(<QuickAddDrawer open onClose={() => {}} settings={settings} repo={repoOk} branches={branches} categories={categories} onCreated={() => {}} />);

  // Fill enough to trigger submit but leave serialNumber empty
  await user.type(screen.getByLabelText(/sku/i), 'SKU-1');
  await user.type(screen.getByLabelText(/^name/i), 'Laptop');
  await user.click(screen.getByRole('button', { name: /save$/i }));
  expect(repoOk.create).not.toHaveBeenCalled();
});
```

NOTE TO IMPLEMENTER: the full happy-path test is exercised end-to-end via `schema.test.js` (validation) + `firestoreAssetRepository.test.js` (create) + this drawer test (gate). One blocking-validation drawer test is sufficient — do not over-test layout in this task.

- [ ] **Step 2: Run to verify fail**

Expected: FAIL "Cannot find module"

- [ ] **Step 3: Implement QuickAddDrawer**

```jsx
// src/components/features/AssetForm/QuickAddDrawer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../../common/Drawer';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { SegmentedModeToggle } from './fields/SegmentedModeToggle';
import { UniquenessHintedInput } from './fields/UniquenessHintedInput';
import { PriceCurrencyRow } from './fields/PriceCurrencyRow';
import { CategoryPicker } from './fields/CategoryPicker';
import { BranchPicker } from './fields/BranchPicker';
import { useUniqueCheck } from '../../../hooks/useUniqueCheck';
import { useAssetCreate } from '../../../hooks/useAssetCreate';
import { validateQuickAdd } from './schema';
import './QuickAddDrawer.css';

const EMPTY = {
  mode: 'tracked',
  sku: '', name: '', category: '', brand: '', model: '',
  branchId: '', purchasePrice: null, currency: 'AMD',
  serialNumber: '', barcode: '', quantity: 1,
};

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   settings: { trackingThresholdUsd: number, usdToAmd: number },
 *   repo: any,
 *   branches: { id: string, name: string }[],
 *   categories: { id: string, label: string }[],
 *   onCreated: (id: string, opts: { openDetails: boolean }) => void,
 *   currentUserDisplayName?: string,
 *   sourceLanguage?: string,
 * }} props
 */
export function QuickAddDrawer({
  open, onClose, settings, repo, branches, categories, onCreated,
  currentUserDisplayName = 'Staff', sourceLanguage = 'en',
}) {
  const { t } = useTranslation('warehouse');
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const create = useAssetCreate(repo);

  // Reset on open/close cycle.
  useEffect(() => { if (!open) { setForm(EMPTY); setTouched(false); } }, [open]);

  // Auto-suggest mode from price unless user manually toggled (touched).
  const validation = useMemo(() => validateQuickAdd(form, settings), [form, settings]);
  useEffect(() => {
    if (!touched && validation.suggestion && form.mode !== validation.suggestion) {
      setForm((f) => ({ ...f, mode: validation.suggestion }));
    }
  }, [validation.suggestion, touched, form.mode]);

  const skuCheck = useUniqueCheck(form.sku, repo.isSkuUnique);
  const barcodeCheck = useUniqueCheck(form.barcode, repo.isBarcodeUnique);
  const serialCheck = useUniqueCheck(form.serialNumber, repo.isSerialUnique);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setMode = (mode) => { setTouched(true); update({ mode }); };

  const blocked =
    !validation.ok
    || skuCheck.status === 'conflict'
    || skuCheck.status === 'checking'
    || (form.mode === 'tracked' && serialCheck.status !== 'unique')
    || (form.mode === 'non-tracked' && barcodeCheck.status !== 'unique');

  const submit = async (openDetails) => {
    if (blocked || !validation.ok) return;
    const n = validation.normalized;
    const id = await create.create({
      sku: n.sku,
      name: n.name,
      sourceLanguage,
      category: n.category,
      brand: n.brand,
      model: n.model,
      branchId: n.branchId,
      holderType: 'storage',
      holderId: n.branchId,
      holderDisplayName: branches.find((b) => b.id === n.branchId)?.name ?? currentUserDisplayName,
      purchasePrice: n.purchasePrice,
      currency: n.currency,
      priceUsd: n.priceUsd,
      quantity: n.quantity,
      isTracked: n.isTracked,
      serialNumber: n.serialNumber,
      barcode: n.barcode,
      condition: 'new',
      acquiredAt: new Date(),
    });
    onCreated(id, { openDetails });
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('addAsset.title')} width={480}>
      <SegmentedModeToggle
        value={form.mode}
        onChange={setMode}
        labels={{ tracked: t('addAsset.modeTracked'), nonTracked: t('addAsset.modeBatch') }}
      />

      <Input label={t('addAsset.fields.name')} value={form.name} onChange={(e) => update({ name: e.target.value })} />
      <CategoryPicker
        value={form.category}
        onChange={(v) => update({ category: v })}
        categories={categories}
        placeholder={t('addAsset.fields.categoryPlaceholder')}
        emptyLabel={t('addAsset.fields.empty')}
      />

      <div className="row-2">
        <Input label={t('addAsset.fields.brand')} value={form.brand} onChange={(e) => update({ brand: e.target.value })} />
        <Input label={t('addAsset.fields.model')} value={form.model} onChange={(e) => update({ model: e.target.value })} />
      </div>

      <BranchPicker
        value={form.branchId}
        onChange={(v) => update({ branchId: v })}
        branches={branches}
        placeholder={t('addAsset.fields.branchPlaceholder')}
        emptyLabel={t('addAsset.fields.empty')}
      />

      <PriceCurrencyRow
        price={form.purchasePrice}
        currency={form.currency}
        onPriceChange={(v) => update({ purchasePrice: v })}
        onCurrencyChange={(v) => update({ currency: v })}
        error={validation.errors.purchasePrice}
        label={t('addAsset.fields.price')}
      />

      <UniquenessHintedInput
        label={t('addAsset.fields.sku')}
        value={form.sku}
        onChange={(v) => update({ sku: v })}
        status={skuCheck.status}
        conflictName={skuCheck.conflictName}
      />

      {form.mode === 'tracked' && (
        <UniquenessHintedInput
          label={t('addAsset.fields.serialNumber')}
          value={form.serialNumber}
          onChange={(v) => update({ serialNumber: v })}
          status={serialCheck.status}
          conflictName={serialCheck.conflictName}
        />
      )}

      {form.mode === 'non-tracked' && (
        <>
          <UniquenessHintedInput
            label={t('addAsset.fields.barcode')}
            value={form.barcode}
            onChange={(v) => update({ barcode: v })}
            status={barcodeCheck.status}
            conflictName={barcodeCheck.conflictName}
          />
          <Input
            type="number"
            min="1"
            label={t('addAsset.fields.quantity')}
            value={form.quantity}
            onChange={(e) => update({ quantity: Number(e.target.value) || 1 })}
          />
          {/* Placeholder for v2 barcode scanner */}
          <Button variant="ghost" type="button" disabled>{t('addAsset.scanBarcode')}</Button>
        </>
      )}

      <div className="quick-add-drawer__actions">
        <Button variant="secondary" type="button" onClick={onClose}>{t('common:cancel')}</Button>
        <Button variant="secondary" type="button" disabled={blocked || create.submitting} onClick={() => submit(false)}>
          {t('addAsset.save')}
        </Button>
        <Button variant="primary" type="button" disabled={blocked || create.submitting} onClick={() => submit(true)}>
          {t('addAsset.saveAndOpen')}
        </Button>
      </div>

      {create.error && <div role="alert" className="quick-add-drawer__error">{create.error.message}</div>}
    </Drawer>
  );
}
```

```css
/* src/components/features/AssetForm/QuickAddDrawer.css */
.quick-add-drawer__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.quick-add-drawer__error { color: var(--danger, #b42318); margin-top: 12px; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.segmented-toggle { display: inline-flex; border: 1px solid var(--border, #d0d5dd); border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.segmented-toggle__btn { padding: 8px 16px; background: transparent; border: 0; cursor: pointer; }
.segmented-toggle__btn.is-active { background: var(--accent, #1d72ff); color: #fff; }
.price-currency-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: end; }
.uniqueness-hinted__conflict { color: var(--danger, #b42318); font-size: 12px; margin-top: 4px; }
```

```js
// src/components/features/AssetForm/index.js
export { QuickAddDrawer } from './QuickAddDrawer';
```

- [ ] **Step 4: Run drawer test**

Run: `npm test -- --watchAll=false src/components/features/AssetForm/QuickAddDrawer.test.jsx`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/AssetForm/
git commit -m "feat(asset-form): QuickAddDrawer composition"
```

---

## Task 10: WarehousePage real implementation

**Files:**
- Create: `src/components/features/Warehouse/WarehouseTable.jsx`
- Create: `src/components/features/Warehouse/WarehouseEmptyState.jsx`
- Create: `src/components/features/Warehouse/WarehouseAddButton.jsx`
- Create: `src/components/features/Warehouse/index.js`
- Modify: `src/pages/WarehousePage/WarehousePage.jsx`
- Modify: `src/pages/WarehousePage/WarehousePage.css`

- [ ] **Step 1: Implement Warehouse feature components**

```jsx
// src/components/features/Warehouse/WarehouseAddButton.jsx
import React from 'react';
import { Button } from '../../common/Button';

export function WarehouseAddButton({ canAdd, onClick, label }) {
  if (!canAdd) return null;
  return <Button variant="primary" type="button" onClick={onClick}>{label}</Button>;
}
```

```jsx
// src/components/features/Warehouse/WarehouseEmptyState.jsx
import React from 'react';
import { EmptyState } from '../../common/EmptyState';
import { Button } from '../../common/Button';

export function WarehouseEmptyState({ canAdd, onAdd, title, description, addLabel }) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={canAdd ? <Button variant="primary" type="button" onClick={onAdd}>{addLabel}</Button> : null}
    />
  );
}
```

```jsx
// src/components/features/Warehouse/WarehouseTable.jsx
import React from 'react';
import { Table } from '../../common/Table';
import { Link } from 'react-router-dom';

export function WarehouseTable({ assets, columns }) {
  const rows = assets.map((a) => ({
    id: a.id,
    name: <Link to={`/warehouse/${a.id}`}>{a.name}</Link>,
    sku: a.sku,
    category: a.category,
    quantity: a.quantity ?? 1,
    branchId: a.branchId,
  }));
  return <Table columns={columns} rows={rows} />;
}
```

```js
// src/components/features/Warehouse/index.js
export { WarehouseTable } from './WarehouseTable';
export { WarehouseEmptyState } from './WarehouseEmptyState';
export { WarehouseAddButton } from './WarehouseAddButton';
```

- [ ] **Step 2: Rewrite WarehousePage**

```jsx
// src/pages/WarehousePage/WarehousePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { Toast } from '../../components/common/Toast';
import { WarehouseTable, WarehouseEmptyState, WarehouseAddButton } from '../../components/features/Warehouse';
import { QuickAddDrawer } from '../../components/features/AssetForm';
import { useAuth } from '../../hooks/useAuth';
import { useWarehouseSettings } from '../../hooks/useWarehouseSettings';
import { useStorageAssets } from '../../hooks/useStorageAssets';
import { useBranchesOverview } from '../../hooks/useBranchesOverview';
import { createAssetRepository } from '../../infra/repositories/firestoreAssetRepository';
import './WarehousePage.css';

export function WarehousePage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const canAdd = role === 'admin' || role === 'super_admin';

  const settings = useWarehouseSettings();
  const repo = useMemo(() => createAssetRepository({ uid: user?.uid }), [user?.uid]);
  const { assets, loading } = useStorageAssets(repo);
  const { branches } = useBranchesOverview();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Hotkey: N opens drawer for staff.
  useEffect(() => {
    function onKey(e) {
      if (!canAdd) return;
      if (e.key === 'n' || e.key === 'N') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        setDrawerOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd]);

  const columns = [
    { key: 'name', label: t('table.name') },
    { key: 'sku', label: t('table.sku') },
    { key: 'category', label: t('table.category') },
    { key: 'quantity', label: t('table.quantity') },
    { key: 'branchId', label: t('table.branch') },
  ];

  // Categories come from /settings/global_lists; for MVP we read whatever the
  // existing settings hook exposes. If not yet wired, an empty list is acceptable
  // — the drawer's CategoryPicker will simply show its empty state.
  const categories = []; // TODO wire to /settings/global_lists.categories in a follow-up

  const handleCreated = (id, { openDetails }) => {
    setToast({ message: t('addAsset.created') });
    if (openDetails) navigate(`/warehouse/${id}`);
  };

  return (
    <div className="warehouse-page">
      <PageHeader
        title={t('title')}
        actions={
          <WarehouseAddButton
            canAdd={canAdd}
            onClick={() => setDrawerOpen(true)}
            label={t('addAsset.button')}
          />
        }
      />

      {loading ? null : assets.length === 0 ? (
        <WarehouseEmptyState
          canAdd={canAdd}
          onAdd={() => setDrawerOpen(true)}
          title={t('empty.title')}
          description={t('empty.description')}
          addLabel={t('empty.addFirst')}
        />
      ) : (
        <WarehouseTable assets={assets} columns={columns} />
      )}

      <QuickAddDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        repo={repo}
        branches={branches ?? []}
        categories={categories}
        onCreated={handleCreated}
        currentUserDisplayName={user?.displayName ?? 'Staff'}
        sourceLanguage="en"
      />

      {toast && <Toast onDismiss={() => setToast(null)}>{toast.message}</Toast>}
    </div>
  );
}
```

NOTE TO IMPLEMENTER: `useAuth` currently exposes `{ user, role }`; if its signature differs in this codebase, adapt at the call site only. Do NOT change the hook's API in this task.

- [ ] **Step 3: Update WarehousePage.css**

Replace the existing file body with:

```css
/* src/pages/WarehousePage/WarehousePage.css */
.warehouse-page { display: flex; flex-direction: column; gap: 16px; padding: 24px; }
```

- [ ] **Step 4: Run all tests**

Run: `npm test -- --watchAll=false`
Expected: PASS — every test added in this plan plus the existing suite stays green.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/Warehouse/ src/pages/WarehousePage/
git commit -m "feat(warehouse): real WarehousePage with add button, hotkey, drawer integration"
```

---

## Task 11: i18n keys (en, ru, hy)

**Files:**
- Create: `src/locales/en/warehouse.json`
- Create: `src/locales/ru/warehouse.json`
- Create: `src/locales/hy/warehouse.json`
- Modify: `src/i18n/index.js` (register new namespace)

- [ ] **Step 1: Add namespace registration**

In `src/i18n/index.js`, find the resources object and add the `warehouse` namespace per locale. Example diff sketch:

```js
// resources block — add 'warehouse' alongside 'common'
en: { common: enCommon, warehouse: enWarehouse },
ru: { common: ruCommon, warehouse: ruWarehouse },
hy: { common: hyCommon, warehouse: hyWarehouse },
```

Imports added at the top:

```js
import enWarehouse from '../locales/en/warehouse.json';
import ruWarehouse from '../locales/ru/warehouse.json';
import hyWarehouse from '../locales/hy/warehouse.json';
```

- [ ] **Step 2: Author en/warehouse.json**

```json
{
  "title": "Warehouse",
  "table": {
    "name": "Name",
    "sku": "SKU",
    "category": "Category",
    "quantity": "Qty",
    "branch": "Branch"
  },
  "empty": {
    "title": "Warehouse is empty",
    "description": "No items are stored at any branch yet.",
    "addFirst": "Add the first item"
  },
  "addAsset": {
    "button": "+ Add asset",
    "title": "Add asset",
    "modeTracked": "Single tracked item",
    "modeBatch": "Batch of identical",
    "scanBarcode": "Scan barcode",
    "save": "Save",
    "saveAndOpen": "Save and open details",
    "created": "Asset created",
    "fields": {
      "name": "Name",
      "categoryPlaceholder": "Pick category",
      "branchPlaceholder": "Pick branch",
      "brand": "Brand",
      "model": "Model",
      "price": "Price",
      "sku": "SKU",
      "serialNumber": "Serial number",
      "barcode": "Code (barcode)",
      "quantity": "Quantity",
      "empty": "Nothing matches"
    }
  }
}
```

- [ ] **Step 3: Author ru/warehouse.json**

```json
{
  "title": "Склад",
  "table": {
    "name": "Название",
    "sku": "SKU",
    "category": "Категория",
    "quantity": "Кол-во",
    "branch": "Филиал"
  },
  "empty": {
    "title": "Склад пуст",
    "description": "На филиалах пока нет ни одной вещи.",
    "addFirst": "Добавить первую вещь"
  },
  "addAsset": {
    "button": "+ Добавить вещь",
    "title": "Добавить вещь",
    "modeTracked": "Уникальная вещь",
    "modeBatch": "Партия одинаковых",
    "scanBarcode": "Сканировать штрихкод",
    "save": "Сохранить",
    "saveAndOpen": "Сохранить и открыть детали",
    "created": "Вещь добавлена",
    "fields": {
      "name": "Название",
      "categoryPlaceholder": "Выберите категорию",
      "branchPlaceholder": "Выберите филиал",
      "brand": "Бренд",
      "model": "Модель",
      "price": "Стоимость",
      "sku": "SKU",
      "serialNumber": "Серийный номер",
      "barcode": "Код (штрихкод)",
      "quantity": "Количество",
      "empty": "Ничего не найдено"
    }
  }
}
```

- [ ] **Step 4: Author hy/warehouse.json**

```json
{
  "title": "Պահեստ",
  "table": {
    "name": "Անվանում",
    "sku": "SKU",
    "category": "Կատեգորիա",
    "quantity": "Քանակ",
    "branch": "Մասնաճյուղ"
  },
  "empty": {
    "title": "Պահեստը դատարկ է",
    "description": "Ոչ մի իր դեռ չի գրանցված։",
    "addFirst": "Ավելացնել առաջին իրը"
  },
  "addAsset": {
    "button": "+ Ավելացնել իր",
    "title": "Ավելացնել իր",
    "modeTracked": "Եզակի իր",
    "modeBatch": "Միանման իրերի խումբ",
    "scanBarcode": "Սկանավորել շտրիխկոդը",
    "save": "Պահպանել",
    "saveAndOpen": "Պահպանել և բացել",
    "created": "Իրը ավելացված է",
    "fields": {
      "name": "Անվանում",
      "categoryPlaceholder": "Ընտրեք կատեգորիա",
      "branchPlaceholder": "Ընտրեք մասնաճյուղ",
      "brand": "Բրենդ",
      "model": "Մոդել",
      "price": "Արժեք",
      "sku": "SKU",
      "serialNumber": "Սերիական համար",
      "barcode": "Կոդ (շտրիխկոդ)",
      "quantity": "Քանակ",
      "empty": "Ոչինչ չի գտնվել"
    }
  }
}
```

- [ ] **Step 5: Run all tests + build**

Run: `npm test -- --watchAll=false && npm run build`
Expected: tests PASS; build SUCCESS with no new warnings.

- [ ] **Step 6: Commit**

```bash
git add src/locales/ src/i18n/index.js
git commit -m "feat(i18n): add warehouse namespace (en, ru, hy)"
```

---

## Out of scope (do NOT implement here)

- Asset detail page at `/warehouse/:assetId` — only the route navigation after "Save and open" is wired. The detail page is a stub for now (existing placeholder is acceptable).
- Settings UI for editing `/settings/warehouse` and `/settings/exchangeRates` — super_admin will edit via Firestore Console for MVP; a real settings UI is a separate plan.
- Barcode scanner integration — UI button placed but disabled.
- Receipt-of-batch flow (Variant D from brainstorming) — explicitly deferred.
- Asset list filters / pagination beyond the default 200-item live subscription.
- Update / archive / transfer flows for assets.
- Analytics events on create.
- Currency-rate auto-fetch from an external API.
- Migration of existing assets — there are none.

---

## Risks

1. **Threshold default = 500 USD (resolved with user 2026-04-26).** A typical office laptop ($1500–$2500) now lands in tracked mode (per-unit serial number); cheap peripherals (mice, cables, cartridges) land in non-tracked batch mode. If the threshold proves wrong in practice, super_admin edits `/settings/warehouse.trackingThresholdUsd` — no code change required.
2. **Manual exchange rate.** USD/AMD is super_admin-edited; if not maintained, USD-equivalents drift. MVP accepts this; a later iteration may pull from an FX API.
3. **Cross-document uniqueness is not enforceable in Firestore rules.** The repository's pre-write check is racy under concurrent inserts. For MVP this is acceptable (low-volume single-tenant warehouse); a future iteration may move uniqueness to a Cloud Function with a transaction or to a dedicated `/uniqueIndexes/{field}/{value}` doc pattern.
4. **`useAuth` shape assumption.** Implementer should verify `useAuth` exposes `{ user, role }`; adapt at the call site only.
5. **Drawer kit component.** If the existing `Drawer` component does not accept a `width` prop or `title`, adapt the QuickAddDrawer call site to whatever API exists; do not modify the kit Drawer in this plan.

---

## Notes (clarifications added 2026-04-26)

- **Form default currency = AMD.** Most warehouse items are priced in AMD; USD is supported as a secondary option (typical use case: software licenses).
- **Software licenses** are stored as a standard Asset with `category = "Software"` (when present in `/settings/global_lists.categories`). The license key goes into `serialNumber` if `priceUsd ≥ trackingThresholdUsd`, otherwise into `barcode`. No new fields required.
- **Settings documents (`/settings/warehouse`, `/settings/exchangeRates`) are NOT seeded by this plan.** The `firestoreSettingsRepository` reads them at runtime; if a doc is missing, it returns the in-code defaults (`trackingThresholdUsd: 500`, `usdToAmd: 390`) silently. Super_admin creates the docs in Firestore Console when ready.
- **Empty/missing categories.** If `/settings/global_lists.categories` is empty or absent, the category `SearchableSelect` renders disabled with a tooltip "Categories not configured — ask super_admin". The form must still be openable (other fields render normally), but `Save` is blocked until a category is set. This is enforced by `validateQuickAdd`.
- **`firestore.rules` are NOT modified.** Existing rules already allow `isStaff()` writes to `/assets/*` and `isSuperAdmin()` writes to `/settings/{docId}`. The implementer must not edit `firestore.rules`.

---

## Subagents to dispatch (in order — orchestrator only, do NOT auto-launch)

1. **domain-modeler** → Task 1 (extend AssetRepository typedefs, add pricing.js, settingsKeys.js)
2. **firebase-engineer** → Task 2 + Task 3 (settings repo, asset repo with uniqueness + create) — no rules changes; existing rules already cover writes
3. **react-ui-engineer** → Task 4 (SearchableSelect kit), Task 5 (schema), Task 6 (hooks), Task 7 (storage list hook), Task 8 (field components), Task 9 (QuickAddDrawer), Task 10 (WarehousePage)
4. **i18n-engineer** → Task 11 (en/ru/hy warehouse.json + namespace registration)
5. **test-engineer** → runs after EVERY implementer above; gating, must report PASS before next implementer
6. **spec-reviewer** → after all implementers PASS test-engineer
7. **code-quality-reviewer** → after spec-reviewer PASS
8. **security-reviewer** → MUST run; the feature does not change `firestore.rules`, but it adds a new collection (`/settings/warehouse`, `/settings/exchangeRates`) and exercises staff-only writes on `/assets/*`. Reviewer confirms client-side `canAdd` matches `isStaff()` on the rules side, that no field bypass exists, and that no secrets/tokens are written into Firestore.

---

## Verification checklist (Phase 6 gate — orchestrator runs)

- [ ] `npm test -- --watchAll=false` PASS, no skipped suites
- [ ] `npm run build` SUCCESS with no new warnings
- [ ] Manual: log in as `user` → `+ Add asset` button is NOT visible, hotkey N does nothing
- [ ] Manual: log in as `admin` → click `+ Add asset` → segmented toggle, fill tracked form → Save → toast appears, table row appears
- [ ] Manual: enter SKU that already exists → red ✗ inline with conflict name; Save button disabled
- [ ] Manual: switch to non-tracked mode → fill barcode + quantity 5 → Save and open details → navigates to `/warehouse/:id`
- [ ] Manual: enter price 100 USD → mode auto-suggests "non-tracked"; enter 1500 USD → mode auto-suggests "tracked"
- [ ] Manual: enter price 195000 AMD with rate 390 → priceUsd should be 500 → mode "tracked" (boundary inclusive)
- [ ] Firebase Console: new doc in `/assets/*` carries `priceUsd`, `quantity`, `isTracked`, `holderType: 'storage'`, `status: 'active'`
