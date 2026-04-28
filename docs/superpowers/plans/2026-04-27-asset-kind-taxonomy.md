# Plan: Asset Kind Taxonomy (Device / Furniture / Accessory / Other)

**Status:** ready for execution
**Date:** 2026-04-27
**Author:** warehouse-orchestrator
**Scope:** Feature 2 of 2. Ships AFTER `2026-04-27-row-action-icons.md`.

**Depends on:** `2026-04-27-design-system-upgrade.md` — that plan ships first
and lifts the kit (tokens, Inter font, Input leadingIcon, Modal/Drawer/Table
padding, glass shadows, NEW `FieldGroup` component). Every UI task below
consumes the upgraded kit. Do NOT start the Feature 2 UI tasks until the
design-system plan's tasks DS-A through DS-F all PASS.

**Visual baseline (consume from design-system upgrade):**
- Drawer body padding is 32px / 24px; section title sizing is 22px / 600.
- Group related fields with `<FieldGroup title?>` (slate-50 panel, 12px
  radius) — Quick-Add splits into "Identity", "Pricing & code",
  "Condition & warranty" groups. EditAssetDrawer mirrors the same grouping.
- Date inputs (warranty start/end) use the new auto-attached calendar
  leading icon — no extra wiring needed.
- Inputs have 8px radius and a soft blue focus glow by default.
- Tables breathe (row ~56–60px). The Kind filter chip group sits in the
  generous space above the table.

## 1. Problem

The current taxonomy is a flat 9-key category list (`laptop, desktop, monitor,
peripheral, phone, tablet, furniture, vehicle, other`). The user surfaced two
problems:

1. **Ontology is wrong.** The list mixes a class (Furniture) with members of
   another class (Phone, Laptop). The user wants two top-level lists at a
   minimum: "Device" (the gear) vs "գույք / Мебель" (furniture: cabinet, desk,
   chair, water cooler, …).
2. **Practical needs missing:**
   - Items > 50,000 AMD must require an inventory code (Devices and Furniture).
   - Accessories (mouse, keyboard, headset, …) are tracked by quantity, not
     itemised.
   - "Licenses" are a separate class entirely (handled by a different
     iteration; Q1=B locked).

Plus general visual polish, ERP-grade.

## 2. Goal

Introduce a first-class `kind` field on the asset doc with four values:
`device | furniture | accessory | other`. The kind drives:

- Which Type list the form shows.
- Whether `quantity` is editable (yes only for `accessory`; itemised for
  the others).
- Whether `sku` (inventory code) is required (price-threshold rule, separately
  configurable from the existing `trackingThresholdUsd`).
- Whether `needsReview` is set (auto-migration of legacy docs that don't map
  cleanly).

The Quick-Add Drawer gets a 4-button segmented control at the very top, before
the existing "Does this item have a code?" question. Selecting a kind narrows
all subsequent fields.

## 3. Out of Scope (explicit)

- **Licenses** — fully separate page + collection. Q1 = (B). Not touched here.
- **Vehicle** — dropped as a kind. Existing `vehicle` category docs migrate
  to `kind: 'other', needsReview: true`. We do NOT delete them.
- **Bulk re-classification UI** — super_admin re-classifies one row at a time
  via Edit. A bulk picker is a future iteration.
- **Accessory deduction on transfer** — the trial transfer flow stays
  itemised even for accessories (the `quantity` field is the source of truth;
  partial-quantity transfer is iter-2).
- **Renaming the existing `category` field** — we keep `category` AND add
  `kind`. `category` becomes the secondary "Type" within a kind.
  Migration writes both.
- **Dropping the `peripheral` value from the type list** — the value still
  exists on legacy docs. It maps to `kind: 'accessory'` during migration;
  going forward `peripheral` is no longer offered as a Type.

## 4. Domain Model Changes

### 4.1 New typedef block in `src/domain/categories.js`

The file becomes the single source of truth for both the kind taxonomy AND the
type-per-kind lists. Rename of the existing helpers stays backwards compatible
(see §4.4).

```js
/** @typedef {'device' | 'furniture' | 'accessory' | 'other'} AssetKind */

export const ASSET_KINDS = /** @type {const} */ ([
  'device',
  'furniture',
  'accessory',
  'other',
]);

export const TYPES_BY_KIND = {
  device: [
    'laptop', 'desktop', 'monitor', 'phone', 'tablet',
    'printer', 'scanner', 'projector', 'router', 'switch',
    'ups', 'smart_tv', 'ip_phone', 'nas', 'dock_station',
    'external_hdd',
  ],
  furniture: [
    'cabinet', 'desk', 'table', 'conference_table', 'chair',
    'office_chair', 'sofa', 'pedestal', 'bookshelf', 'locker',
    'safe', 'coat_rack', 'whiteboard', 'printer_stand',
    'server_rack', 'fridge', 'microwave', 'kettle',
    'water_cooler', 'ac_unit', 'lamp', 'mirror',
  ],
  accessory: [
    'mouse', 'keyboard', 'headset', 'webcam', 'charger',
    'cable', 'usb_hub', 'mousepad', 'usb_stick',
    'hdd_dock', 'presenter_remote', 'microphone',
    'card_reader', 'adapter',
  ],
  other: [
    'other_misc',
  ],
};
```

Rationale on accessory list (decided by orchestrator per user feedback to stop
asking): ~14 entries reflect items an Armenia-based office actually tracks by
quantity. Excluded "battery" / "stationery" — those are consumables, not
assets.

### 4.2 Kind ↔ legacy `category` mapping (used by migration AND form)

```js
export const LEGACY_CATEGORY_TO_KIND = {
  laptop: 'device',
  desktop: 'device',
  monitor: 'device',
  phone: 'device',
  tablet: 'device',
  peripheral: 'accessory',   // user requested this re-class
  furniture: 'furniture',
  vehicle: 'other',          // vehicle dropped; flag needsReview
  other: 'other',
};
```

### 4.3 Update `suggestCategoryGroup` to also expose `suggestKind`

Backwards-compatible: the existing `suggestCategoryGroup(name)` still returns
`'electronics'|'furniture'|'vehicle'|'other'|null`. Add a new pure function
`suggestKind(name): AssetKind | null` that maps `electronics → device,
furniture → furniture, vehicle → other`. The keyword dictionary in the file
continues to grow — add accessory keywords (`mouse`, `keyboard`, `headset`,
etc.) into a new `accessory` bucket and have `suggestKind` map
`accessory → accessory`.

```js
// new keyword bucket entries (samples — full list in implementation)
mouse: 'accessory', клавиатура: 'accessory', keyboard: 'accessory',
headset: 'accessory', наушники: 'accessory', webcam: 'accessory',
charger: 'accessory', кабель: 'accessory', cable: 'accessory',
hub: 'accessory', mousepad: 'accessory',
```

`CATEGORY_GROUPS` gets an `accessory` bucket. `filterCategoriesByName` keeps
working unchanged for legacy callers, but a new
`filterTypesByKind(kind, types)` is the preferred API going forward.

### 4.4 Inventory-code threshold (price rule)

This rule is SEPARATE from the existing `trackingThresholdUsd` rule. Both
coexist:

- `trackingThresholdUsd` (existing, USD-denominated) → suggests / requires
  serial-number-tracked single-unit mode. Threshold in `/settings/warehouse`.
- `inventoryCodeThresholdAmd` (new, AMD-denominated) → requires `sku`
  (inventory code) for `kind ∈ {device, furniture}`. Default **50000** AMD.
  Stored in `/settings/warehouse.inventoryCodeThresholdAmd`.

New pure helper in `src/domain/pricing.js`:

```js
export const DEFAULT_INVENTORY_CODE_THRESHOLD_AMD = 50000;

/**
 * @param {{ kind: AssetKind, purchasePrice: number|null, currency: 'USD'|'AMD' }} input
 * @param {{ inventoryCodeThresholdAmd: number, usdToAmd: number }} settings
 * @returns {boolean} true if SKU is REQUIRED for this asset
 */
export function isInventoryCodeRequired(input, settings) {
  if (input.kind !== 'device' && input.kind !== 'furniture') return false;
  if (input.purchasePrice == null) return false;
  const priceAmd = input.currency === 'AMD'
    ? input.purchasePrice
    : input.purchasePrice * settings.usdToAmd;
  return priceAmd > settings.inventoryCodeThresholdAmd;
}
```

Note: comparison is **strictly greater than** ("превышает 50,000"). Equal to
the threshold does NOT require an inventory code. Spec by user: "если цена
больше 50,000".

### 4.5 Settings doc shape diff

`/settings/warehouse`:

```js
// before
{ trackingThresholdUsd: number, updatedAt, updatedBy }
// after
{ trackingThresholdUsd: number,
  inventoryCodeThresholdAmd: number,  // NEW, default 50000
  updatedAt, updatedBy }
```

Update `WarehouseSettings` typedef in `src/domain/settingsKeys.js`:

```js
/**
 * @typedef {Object} WarehouseSettings
 * @property {number} trackingThresholdUsd
 * @property {number} inventoryCodeThresholdAmd
 */
```

Update `firestoreSettingsRepository.js` to `safePositiveNumber()` the new
field with `DEFAULT_INVENTORY_CODE_THRESHOLD_AMD`.
Update `useWarehouseSettings.js` to expose `inventoryCodeThresholdAmd`
alongside the existing fields, with the same `ready` gating.

### 4.6 Asset doc shape diff

```js
// before (Firestore /assets/{id}) — selected fields
{ category, sku, name, quantity, isTracked, ... }
// after
{ kind: 'device'|'furniture'|'accessory'|'other',  // NEW, required on write
  category,                                         // KEPT; semantics = "type within kind"
  sku, name, quantity, isTracked,
  needsReview: boolean,                             // NEW, defaults false; true on legacy migrations and on `kind:'other'` from Quick-Add
  ... }
```

`category` is no longer a flat enum. Its value space is now exactly
`TYPES_BY_KIND[kind]` ∪ legacy values (kept for back-compat read; no new
writes use legacy values).

### 4.7 Accessory model

For `kind: 'accessory'`:

- Quick-Add **always** behaves as if `hasCode === false` — no inventory code
  field, no model field. The Yes/No question is HIDDEN (force `hasCode = false`
  internally).
- `quantity` is required and editable. Min 1, integer.
- Inventory code never required regardless of price.
- Doc shape: one Firestore doc per (name + branch + category) tuple. Adding the
  same accessory increments the existing doc's quantity instead of creating a
  new doc.

**Accessory dedup decision (orchestrator-resolved):** the form, on Save, calls
`repo.findAccessory({ name, category, branchId })` first. If it returns an
existing doc, call `repo.incrementQuantity(id, +n)`. Otherwise call `create()`
as today. This is exposed as a NEW repo method `createOrIncrementAccessory`.
Tracked uniqueness on `(kind:'accessory', name, category, branchId, status:'active')`.

`firestoreAssetRepository.js` gets:

```js
async function findActiveAccessory({ name, category, branchId }) {
  const q = query(
    collection(db, ASSETS),
    where('kind', '==', 'accessory'),
    where('name', '==', name),
    where('category', '==', category),
    where('branchId', '==', branchId ?? null),
    where('status', '==', 'active'),
    limit(2),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return toAsset(snap.docs[0]);
}

async function incrementQuantity(id, delta) {
  const ref = doc(db, ASSETS, id);
  await updateDoc(ref, {
    quantity: increment(delta),
    updatedAt: serverTimestamp(),
    updatedBy: opts.uid,
  });
}

async function createOrIncrementAccessory(input) {
  const existing = await findActiveAccessory({
    name: input.name, category: input.category, branchId: input.branchId,
  });
  if (existing) {
    await incrementQuantity(existing.id, input.quantity ?? 1);
    return existing.id;
  }
  return await create({ ...input, kind: 'accessory', isTracked: false });
}
```

`firebase/firestore` gets `increment` added to its imports.

### 4.8 `needsReview` flag

Set to `true` in three cases:

1. Legacy migration where `LEGACY_CATEGORY_TO_KIND[category]` is `'other'` AND
   the original category was `vehicle` (semantic loss).
2. Legacy migration where `category` is missing or unknown.
3. Quick-Add with `kind === 'other'` (the user explicitly opted into the
   catch-all bucket; super_admin should triage later).

The warehouse table gets a "Needs review" filter chip (super_admin only).

## 5. Quick-Add UX

### 5.1 Layout (top to bottom)

```
┌─────────────────────────────────────────┐
│  Add asset                          ✕  │
├─────────────────────────────────────────┤
│  ┌──────┐ ┌────────┐ ┌──────────┐ ┌────┐│
│  │Device│ │Furniture│ │Accessory │ │Other││  ← segmented control (NEW)
│  └──────┘ └────────┘ └──────────┘ └────┘│
│                                          │
│  Does this item have a code?  [Yes][No] │  ← hidden when kind === 'accessory'
│                                          │
│  Name           [SearchableSelect]      │
│  Type           [TypePicker — narrowed] │  ← list = TYPES_BY_KIND[kind]
│                                          │
│  (if hasCode === true:)                 │
│  Model / Specs  [Input]                 │
│  Code           [UniquenessHintedInput] │  ← required when isInventoryCodeRequired()
│                                          │
│  (if kind === 'accessory' OR hasCode === false:)
│  Quantity       [Input number, min 1]   │
│                                          │
│  Condition      [New][Used]             │
│  Warranty start / Warranty end          │  ← only when condition === 'new'
│                                          │
│  (validation messages render inline)     │
│                                          │
│  [Save (preview shows: "Inventory code  │
│   required because price exceeds 50,000  │
│   AMD")]                                 │
└─────────────────────────────────────────┘
```

### 5.2 Segmented control component

NEW shared component: `src/components/common/SegmentedControl/`

```js
<SegmentedControl
  options={[
    { value: 'device',    label: t('addAsset.kind.device') },
    { value: 'furniture', label: t('addAsset.kind.furniture') },
    { value: 'accessory', label: t('addAsset.kind.accessory') },
    { value: 'other',     label: t('addAsset.kind.other') },
  ]}
  value={form.kind}
  onChange={(v) => updateKind(v)}
  ariaLabel={t('addAsset.fields.kind')}
/>
```

Visual: 4 equal-width buttons in a single rounded container, 36px tall,
border 1px `var(--color-border)`, the active option has bg
`var(--color-primary)` and color `#fff`. Border-radius outer 10px, inner
buttons inherit. Tab focus moves to the active option; arrow keys cycle. ARIA
role `tablist` + `tab` per option.

Use `frontend-design:frontend-design` skill to polish the styling for this
component — the user explicitly called out visual quality. The control
inherits the design-system tokens (Inter, 8px radius, soft blue focus glow);
the active button uses `--color-primary` (now blue-600).

### 5.3 Side-effect of changing kind

- Reset `category` to `''` (the Type list flips entirely).
- If new kind is `accessory`, force `hasCode = false`, hide model + code
  fields, show quantity.
- If new kind is `other`, set `needsReview = true` on submit (form-level
  computed; not a UI control).
- `name` and `condition` survive a kind switch.

### 5.4 Smart kind from name (UX nicety)

If the user lands on the form with empty kind and types a name first, run
`suggestKind(name)` on each keystroke and pre-select that kind in the
segmented control IF the user hasn't manually clicked one. A user click
"locks" the kind regardless of subsequent name edits.

### 5.5 Inventory-code-required preview

Below the price area (or, if price isn't asked here yet, below the segmented
control), render a subtle hint when `isInventoryCodeRequired(...)` would be
`true`:

> "Inventory code is required when the price exceeds 50,000 AMD."

Translated key: `addAsset.codeRequiredHint`. The hint is informational; the
actual gate is in validation.

### 5.6 Validation diff (`schema.js`)

`validateQuickAdd(form)` adds checks:

- `kind` required → error `'kind:required'`.
- If `kind === 'accessory'`, treat `hasCode` as `false` (force).
- If `kind === 'other'`, normalized output sets `needsReview: true`.
- If `isInventoryCodeRequired({ kind, purchasePrice, currency }, settings)`
  returns `true`, then `code` is required and the `hasCode` answer is forced
  to `'yes'` (the No path is invalid for high-price device/furniture).
  Error: `'code:requiredAboveThreshold'`.

The schema function gains a second optional argument `settings = { ... }` so
unit tests can pass synthetic thresholds.

### 5.7 Hotkeys

The "N" hotkey already opens the drawer. Inside the drawer, optional
shortcut: `1`/`2`/`3`/`4` selects Device/Furniture/Accessory/Other when no
input has focus. Implement only if trivial; otherwise skip and revisit.

## 6. Warehouse Page UX

### 6.1 Kind filter

Above the table, between the search and sort controls, add a kind filter as a
horizontal chip group:

```
[ All ] [ Device ] [ Furniture ] [ Accessory ] [ Other ] [ Needs review (super_admin only) ]
```

State stored in WarehousePage as `kindFilter: AssetKind | 'all' | 'review'`.
The "Needs review" chip is shown only when `role === 'super_admin'`.

### 6.2 Kind column

Add `kind` as a sortable column between `category` and `code`. Header label:
`t('table.kind')`. Cell renders the localized kind name (e.g. "Device" /
"Մարզ. տեսակ" / "Тип"). For legacy docs missing `kind` (in case migration
hasn't run yet), render `—`.

### 6.3 Group counts in headers (optional polish)

When kind filter is `all`, append counts to each chip:

```
[ All (47) ] [ Device (28) ] [ Furniture (12) ] [ Accessory (5) ] [ Other (2) ]
```

If the count math creates clutter, drop. Polish-tier feature.

### 6.4 Needs-review badge

In the Name cell, when `asset.needsReview === true`, append a small
amber-pill badge "Review" (i18n key `table.needsReviewBadge`). Only shown to
super_admin. Click on row still opens Details.

## 7. Migration

### 7.1 Goal

Backfill `kind` (+ `needsReview` where applicable) for every existing asset
doc. Idempotent: safe to re-run; never overwrites an already-correct `kind`.

### 7.2 Strategy

A one-shot Node script lives at `scripts/migrate-asset-kind.mjs`:

- Reads all `/assets/*` docs.
- For each, computes:
  - if `kind` already set → skip.
  - else `proposedKind = LEGACY_CATEGORY_TO_KIND[category]`, falling back to
    `suggestKind(name)`, falling back to `'other'`.
  - `needsReview = (originalCategory === 'vehicle')
                   || (proposedKind === 'other' && fellBack)
                   || (!category)`.
- Writes back via `updateDoc` with `kind`, `needsReview`,
  `migration: { fromCategory: originalCategory, at: serverTimestamp(),
  by: 'migrate-asset-kind' }`.
- Modes: `--dry-run` (default — log only, no writes), `--commit` (perform
  writes), `--limit=N` (test in batches).

### 7.3 Auth

Script uses Firebase Admin SDK with the service-account JSON path passed via
env var `GOOGLE_APPLICATION_CREDENTIALS`. The repo does NOT commit the SA
file. If the user has not set up Admin yet, fall back to a Firebase emulator
run for dev; document this in the script's header comment.

### 7.4 Order of operations

1. Deploy code that reads `kind` defensively (treats missing `kind` as
   "needs migration"). This is what the rest of this plan delivers.
2. Run `node scripts/migrate-asset-kind.mjs --dry-run` and review the diff.
3. Run `node scripts/migrate-asset-kind.mjs --commit`.
4. Manual spot-check via UI.
5. (Future) once stable, drop the back-compat read paths.

The migration script is deferred to its own task at the end of execution; the
UI ships in a back-compat-tolerant state so we can deploy + migrate without
race conditions.

## 8. Firestore Rules Impact

`firestore.rules` does not yet exist in repo. This plan does NOT introduce it
(separate hardening iteration). For the feature itself:

- `kind` and `needsReview` are simple top-level fields on `/assets/{id}` —
  same trust boundary as `category`. When rules ARE introduced, both must
  be writable only by `admin` and `super_admin` roles.
- `/settings/warehouse.inventoryCodeThresholdAmd` is writable only by
  `super_admin` (same as the existing `trackingThresholdUsd`).
- Auto-trigger security-reviewer because we touch settings shape and the
  asset doc trust surface — even though there's no rules file yet, the
  reviewer should call out the rules-file gap.

## 9. Files Touched

| Path | Action | Owner role |
|---|---|---|
| `src/domain/categories.js` | extend with `ASSET_KINDS`, `TYPES_BY_KIND`, `LEGACY_CATEGORY_TO_KIND`, `suggestKind`, `filterTypesByKind`, accessory keywords | domain-modeler |
| `src/domain/categories.test.js` | NEW — pure unit tests for `suggestKind`, `filterTypesByKind`, mapping completeness | test-engineer |
| `src/domain/pricing.js` | add `DEFAULT_INVENTORY_CODE_THRESHOLD_AMD`, `isInventoryCodeRequired` | domain-modeler |
| `src/domain/pricing.test.js` | extend tests for `isInventoryCodeRequired` (kind matrix × currency × price) | test-engineer |
| `src/domain/settingsKeys.js` | extend `WarehouseSettings` typedef | domain-modeler |
| `src/domain/repositories/AssetRepository.js` | add `kind`, `needsReview` to typedef; add `createOrIncrementAccessory`, `findActiveAccessory`, `incrementQuantity` to interface | domain-modeler |
| `src/infra/repositories/firestoreSettingsRepository.js` | read + subscribe `inventoryCodeThresholdAmd` | firebase-engineer |
| `src/infra/repositories/firestoreSettingsRepository.test.js` | extend tests for new field default + override | test-engineer |
| `src/infra/repositories/firestoreAssetRepository.js` | persist `kind` + `needsReview` in `create`, add `findActiveAccessory`, `incrementQuantity`, `createOrIncrementAccessory`; import `increment` | firebase-engineer |
| `src/infra/repositories/firestoreAssetRepository.test.js` | tests for accessory dedup increment, kind field write | test-engineer |
| `src/hooks/useWarehouseSettings.js` | expose `inventoryCodeThresholdAmd` | firebase-engineer |
| `src/hooks/useAssetCreate.js` | route accessory writes through `createOrIncrementAccessory`; preserve return shape | react-ui-engineer |
| `src/hooks/useAssetCreate.test.js` | test routing branch | test-engineer |
| `src/components/common/SegmentedControl/SegmentedControl.jsx` | NEW shared component | react-ui-engineer (designed via frontend-design skill) |
| `src/components/common/SegmentedControl/SegmentedControl.css` | NEW | react-ui-engineer |
| `src/components/common/SegmentedControl/SegmentedControl.test.jsx` | NEW | test-engineer |
| `src/components/common/index.js` | export SegmentedControl | react-ui-engineer |
| `src/components/features/AssetForm/QuickAddDrawer.jsx` | add Kind segmented control, narrow Type list, hide hasCode for accessories, force code when `isInventoryCodeRequired`, plug `inventoryCodeThresholdAmd` from settings hook, render preview hint | react-ui-engineer |
| `src/components/features/AssetForm/QuickAddDrawer.test.jsx` | tests for kind switching, accessory path, threshold path | test-engineer |
| `src/components/features/AssetForm/schema.js` | add `kind` validation + threshold-aware `code` requirement; accept `settings` arg | domain-modeler |
| `src/components/features/AssetForm/schema.test.js` | extend tests with kind matrix | test-engineer |
| `src/components/features/AssetForm/EditAssetDrawer.jsx` | display + allow editing `kind` (super_admin); narrow Type list to current kind; clear `needsReview` flag when super_admin re-saves | react-ui-engineer |
| `src/pages/WarehousePage/WarehousePage.jsx` | add kind filter chips, Kind column, "Needs review" badge for super_admin, group counts | react-ui-engineer |
| `src/pages/WarehousePage/WarehousePage.css` | chip group styling | react-ui-engineer |
| `src/pages/WarehousePage/WarehousePage.test.jsx` | tests for filter behaviour | test-engineer |
| `src/locales/en/warehouse.json` | new keys (see §10) | i18n-engineer |
| `src/locales/ru/warehouse.json` | new keys | i18n-engineer |
| `src/locales/hy/warehouse.json` | new keys | i18n-engineer |
| `scripts/migrate-asset-kind.mjs` | NEW — Admin-SDK migration script | firebase-engineer |
| `scripts/README.md` | NEW — how to run the script | firebase-engineer |

## 10. Locale Keys (×3 languages)

All under `src/locales/{en,hy,ru}/warehouse.json`. Add:

```json
{
  "addAsset": {
    "kind": {
      "device": "Device",
      "furniture": "Furniture",
      "accessory": "Accessory",
      "other": "Other"
    },
    "fields": {
      "kind": "Kind"
    },
    "codeRequiredHint": "Inventory code is required when the price exceeds {{threshold, number}} {{currency}}.",
    "codeRequiredHintShort": "Inventory code required (price > {{threshold, number}} AMD)"
  },
  "table": {
    "kind": "Kind",
    "needsReviewBadge": "Review"
  },
  "filter": {
    "kindLabel": "Kind",
    "all": "All",
    "needsReview": "Needs review"
  },
  "kinds": {
    "device": "Device",
    "furniture": "Furniture",
    "accessory": "Accessory",
    "other": "Other"
  },
  "types": {
    "laptop": "Laptop", "desktop": "Computer", "monitor": "Monitor",
    "phone": "Phone", "tablet": "Tablet", "printer": "Printer",
    "scanner": "Scanner", "projector": "Projector", "router": "Router",
    "switch": "Switch", "ups": "UPS", "smart_tv": "Smart TV",
    "ip_phone": "IP phone", "nas": "NAS", "dock_station": "Docking station",
    "external_hdd": "External HDD",
    "cabinet": "Cabinet", "desk": "Desk", "table": "Table",
    "conference_table": "Conference table", "chair": "Chair",
    "office_chair": "Office chair", "sofa": "Sofa", "pedestal": "Pedestal",
    "bookshelf": "Bookshelf", "locker": "Locker", "safe": "Safe",
    "coat_rack": "Coat rack", "whiteboard": "Whiteboard",
    "printer_stand": "Printer stand", "server_rack": "Server rack",
    "fridge": "Fridge", "microwave": "Microwave", "kettle": "Kettle",
    "water_cooler": "Water cooler", "ac_unit": "Air conditioner",
    "lamp": "Lamp", "mirror": "Mirror",
    "mouse": "Mouse", "keyboard": "Keyboard", "headset": "Headset",
    "webcam": "Webcam", "charger": "Charger", "cable": "Cable",
    "usb_hub": "USB hub", "mousepad": "Mousepad", "usb_stick": "USB stick",
    "hdd_dock": "HDD dock", "presenter_remote": "Presenter remote",
    "microphone": "Microphone", "card_reader": "Card reader",
    "adapter": "Adapter",
    "other_misc": "Other"
  },
  "errors": {
    "kindRequired": "Pick a kind",
    "codeRequiredAboveThreshold": "Inventory code is required for items over {{threshold, number}} AMD"
  }
}
```

The `categories.*` namespace is kept as-is for back-compat reads of legacy
docs. The new `kinds.*` and `types.*` namespaces are the going-forward source
of truth. The duplication is intentional and documented.

i18n-engineer translates every English key into RU and HY. For Armenian:
- `addAsset.kind.device` = `Սարք`
- `addAsset.kind.furniture` = `Կահույք`
- `addAsset.kind.accessory` = `Աքսեսուար`
- `addAsset.kind.other` = `Այլ`
- (etc. — engineer fills the rest.)
For Russian: `Устройство`, `Мебель`, `Аксессуар`, `Прочее`. (Note the user
requested "Устройство" or "գույք"; both are mapped to the right language.)

## 11. Tasks (sequential)

### Task PRE — design-system upgrade (gating dependency)

Before any task here runs, execute every task in
`2026-04-27-design-system-upgrade.md` (DS-A → DS-F) and confirm both
`npm test -- --watchAll=false` and `npm run build` are green. Tasks below
assume the upgraded kit (tokens, Inter, FieldGroup, Input.leadingIcon, glass
shadows) is in place.

### Task A — domain-modeler: extend `categories.js` + `pricing.js` + typedefs

Implements §4.1, §4.2, §4.3, §4.4, §4.5 (typedef only), §4.6 (typedef only).
Output:
- `src/domain/categories.js` extended.
- `src/domain/pricing.js` extended.
- `src/domain/settingsKeys.js` typedef extended.
- `src/domain/repositories/AssetRepository.js` typedef extended.

Then test-engineer writes/extends:
- `src/domain/categories.test.js` covering: every legacy category maps to a
  known kind; every TYPES_BY_KIND value has a translation key in `en`; suggest
  helpers handle empty / English / Russian / Armenian inputs.
- `src/domain/pricing.test.js` covering: kind × price × currency matrix for
  `isInventoryCodeRequired`.

### Task B — firebase-engineer: settings + asset repo + migration script

Implements §4.5, §4.7, §7.
Output:
- `firestoreSettingsRepository.js` reads `inventoryCodeThresholdAmd`.
- `useWarehouseSettings.js` exposes it.
- `firestoreAssetRepository.js` writes `kind` + `needsReview`, exposes
  `findActiveAccessory`, `incrementQuantity`, `createOrIncrementAccessory`.
- `scripts/migrate-asset-kind.mjs` written but NOT executed against
  production.

test-engineer:
- `firestoreSettingsRepository.test.js` extended for new field default.
- `firestoreAssetRepository.test.js` covers accessory dedup increment +
  kind field persistence.

### Task C — react-ui-engineer (with frontend-design): SegmentedControl

Build `src/components/common/SegmentedControl/`. Pixel-precise per §5.2.
Use the frontend-design skill for the visual pass. Export from
`src/components/common/index.js`.

test-engineer:
- click selects, ARIA role tablist/tab, keyboard arrow-key cycling, focus
  ring, controlled-component value/onChange contract.

### Task D — react-ui-engineer: schema + Quick-Add wiring

Implements §5.1–5.6. Pull `inventoryCodeThresholdAmd` and `usdToAmd` from
`useWarehouseSettings`. Pass them into `validateQuickAdd(form, settings)`.
Render the preview hint per §5.5.

**Visual layout — REQUIRED:** wrap fields in three `<FieldGroup>` panels
(from the design-system upgrade kit):

1. `<FieldGroup title={t('addAsset.groups.identity')}>` — segmented Kind
   control + hasCode toggle + Name + Type.
2. `<FieldGroup title={t('addAsset.groups.pricing')}>` — Code (when shown) +
   Model + Price + Currency + the threshold preview hint.
3. `<FieldGroup title={t('addAsset.groups.condition')}>` — Condition +
   Warranty start + Warranty end. The two date inputs use plain `<Input
   type="date" />` and inherit the auto-attached calendar leading icon from
   the kit.

Add three new keys (`addAsset.groups.identity`, `addAsset.groups.pricing`,
`addAsset.groups.condition`) to the locale list in §10. i18n-engineer
includes them in the en/ru/hy translation pass.

test-engineer:
- kind switching clears category, hides hasCode for accessory, forces code
  when threshold exceeded, accessory submit hits dedup path, "other" sets
  `needsReview`.

### Task E — react-ui-engineer: WarehousePage filter + column + badge

Implements §6.1–6.4.

test-engineer:
- chip click filters; Kind column visible + sortable; "Needs review" chip
  hidden for non-super_admin; badge renders only for super_admin on flagged
  rows.

### Task F — react-ui-engineer: EditAssetDrawer

Allow super_admin to change `kind`. When kind changes, reset `category` to a
valid value (or '' and require re-pick). Provide a "Mark reviewed" button
that clears `needsReview` on save.

**Visual layout — REQUIRED:** mirror Quick-Add's three `<FieldGroup>` panels
("Identity", "Pricing & code", "Condition & warranty") so the two drawers
read as the same surface. Date inputs inherit the auto-attached calendar
leading icon.

test-engineer:
- super_admin sees Kind picker; admin doesn't (or sees read-only); clearing
  `needsReview` works.

### Task G — i18n-engineer: locale keys ×3

All keys per §10 added to all three locale files. English source. Translator
notes (see §10) for the RU/HY anchor terms.

test-engineer:
- render-time assertion that every used key resolves in each language (no
  fallback hits).

### Task H — verification gate

```bash
cd C:/Users/DELL/Desktop/warehouse
npm test -- --watchAll=false
npm run build
```

Both must pass. Paste last 10 lines.

## 12. Review Strategy

After ALL tasks pass test-engineer:

1. **spec-reviewer** — checks every section here against actual code.
2. **code-quality-reviewer** — React + Firebase best practices, with extra
   attention to:
   - No firestore imports leaked into components.
   - SegmentedControl is properly accessible.
   - `isInventoryCodeRequired` is not duplicated in UI vs. repo.
3. **security-reviewer** — auto-triggered because settings shape changes and
   the asset trust surface gains a field. Specifically asks: does the lack of
   `firestore.rules` mean ANY signed-in user can change `kind` /
   `needsReview` on any doc? (Answer: yes, today, until the rules iteration.
   Reviewer must flag this as a known gap, not block.)

## 13. Test Strategy Recap

| Layer | Tool | Scope |
|---|---|---|
| Domain | Jest, no mocks | mappings, helpers, validators |
| Repository | Firebase emulator OR mocked SDK | accessory dedup, write payload shape |
| Hook | RTL + mocked repo | useAssetCreate routing branch |
| Component | RTL + user-event | SegmentedControl, QuickAddDrawer kind paths, WarehousePage filter |
| i18n | render assertion | every active key resolves in en/ru/hy |
| E2E (manual) | npm start | full Quick-Add flow per kind, filter, edit, badge |
| Migration | dry-run against emulator | idempotency, count of changed docs |

## 14. Accessibility

- SegmentedControl: `role="tablist"` outer, `role="tab"` per option,
  `aria-selected` on active, arrow-key cycling. `aria-controls` not needed
  since the segmented control doesn't reveal a tab panel — it just sets state.
- New filter chips: `role="group"` with `aria-label="Kind filter"`; each
  chip is a `<button>` with `aria-pressed` reflecting selected state.
- Preview hint: rendered inside the FormField for the code (or below the
  segmented control) and announced via `aria-live="polite"` on first
  appearance so screen readers learn about the requirement change.
- Badge: text "Review" with `aria-label` = `t('table.needsReviewBadge')`;
  not a button (just a marker).

## 15. Rollback

- Code-only rollback: revert the touched files; both `kind` and
  `inventoryCodeThresholdAmd` become unread on the client. Existing data
  remains valid.
- If the migration script has run: leave the data in place. The new fields
  are additive. No de-migration needed.
- The settings doc gains a new field — leave it; if rolled back, it's
  ignored.

## 16. Manual Verification Steps (Phase 7 deliver)

1. `npm start`. Log in as super_admin.
2. Open `/warehouse`. Confirm Kind column visible, kind filter chips visible
   including "Needs review" chip.
3. Click each chip; table filters as expected.
4. Click "+ Add asset". Confirm 4-button segmented control.
5. Click each kind in turn:
   - **Device:** Yes/No present, Type list = device 16. Set price
     in Edit drawer (since Quick-Add doesn't ask price yet — confirm preview
     hint behaviour for at least one path that does, e.g. via EditAssetDrawer
     after creation).
   - **Furniture:** same shape as Device.
   - **Accessory:** Yes/No hidden; Quantity field shown; Save creates a doc
     with `kind:'accessory'`. Adding the same accessory again increments the
     existing doc rather than creating a new one — verify by row count and
     by quantity going from N → N+1.
   - **Other:** any name accepted; on save, row appears with "Review" badge
     for super_admin and is filtered out of the standard kind chips.
6. Switch language to RU and HY; verify all new strings translate.
7. Log out and log in as `admin` (non-super); confirm "Needs review" chip
   hidden, "Review" badge hidden, but Kind column still visible and filter
   chips for normal kinds work.
8. Run `node scripts/migrate-asset-kind.mjs --dry-run` against emulator;
   confirm legacy `vehicle` rows would be flagged for review.

## 17. Definition of Done

- All 8 tasks PASS test-engineer + reviewer cycles.
- `npm run build` succeeds, `npm test -- --watchAll=false` succeeds, no new
  warnings.
- Manual verification (§16) ticked off.
- Plan exit conditions: every kind path renders polished, professional ERP
  visuals; the threshold-required code rule is enforced AND configurable;
  legacy data is readable and (after dry-run + commit) migrated; user sees
  Russian/Armenian translations for every new label.
- NO commit, NO push (standing user rule).
