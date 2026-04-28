# Iteration 1.5 — Trial Pass: Sort/Search Split, Row Actions, Transfer (no PIN), Renames, Dashboard Storage Counter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Standing rule (from project owner):** **NO git commands.** Do not run `git add`, `git commit`, `git push`, `git checkout`, `git branch`, `git reset`, `git stash`, or any other git invocation. The orchestrator will only run git commands after the user explicitly types "git", "commit", or "push". If a subagent thinks something needs committing, it must say so in its report — not run it.

**Goal:** Ship a clickable "проба" (trial) of warehouse row interactions: separate Sort control, per-row icon actions (Details / Edit / Delete / Transfer), renamed categories (Periphery → Accessories, Desktop → Computer), Name field upgraded to SearchableSelect (combobox), and a new Dashboard counter "Items in storage". Defer pending+PIN transfer, Movement collection, and real Branch/Employee data to Iteration 2.

**Architecture:**
- UI-layer changes only on most surfaces; one repo extension (`update`, `archive`, `transferImmediate`) on `firestoreAssetRepository`.
- Transfer is **immediate-write** (no `transfers/` doc, no PIN). Asset's `holderType`/`holder.id`/`holder.displayName` flip in a single `updateDoc`. A TODO marker in code documents that a Movement log entry is pending Iteration 2.
- Row actions live in a trailing actions cell with icon buttons. Name cell becomes plain text (no `<Link>`). The detail route `/warehouse/:id` stays for deep-linking but is no longer the primary path.
- Sort gets an explicit `<Select>` next to the search input. Header-click sort is preserved as a power-user shortcut.
- Dashboard adds a 6th `StatCard` "Items in storage" backed by a new `subscribeStorageCount` aggregate.

**Tech Stack:** React 19, Firebase v9 modular SDK, react-i18next, existing common UI kit (Drawer, Modal, SearchableSelect, Select, Icon, Button, Table).

---

## Task 1 — Repository extensions: `update`, `archive`, `transferImmediate`

**Role:** firebase-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/infra/repositories/firestoreAssetRepository.js`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/domain/repositories/AssetRepository.js` (typedef additions only — confirm path; if missing, skip the typedef edit and add JSDoc inline in the implementation)

- [ ] **Step 1.1** Add three methods to the factory return object:

```js
async function update(id, patch) {
  const uid = opts.uid;
  if (!uid) throw new Error('createAssetRepository: uid is required for write operations');
  const ref = doc(db, ASSETS, id);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

async function archive(id) {
  await update(id, { status: 'archived', retiredAt: serverTimestamp() });
}

/**
 * Immediate transfer (TRIAL — no pending state, no PIN).
 * TODO(iter-2): replace with createTransferRequest + confirmTransfer + PIN flow.
 * TODO(iter-2): also write a /movements/ log doc here once the collection exists.
 */
async function transferImmediate(assetId, target) {
  // target = { type: 'branch'|'employee', id: string, displayName: string, branchId?: string|null, note?: string }
  const patch = {
    holderType: target.type,
    holderId: target.id,
    holder: { type: target.type, id: target.id, displayName: target.displayName },
    branchId: target.type === 'branch' ? target.id : (target.branchId ?? null),
  };
  await update(assetId, patch);
}
```

- [ ] **Step 1.2** Import `updateDoc` from `firebase/firestore` at the top of the file. Add `update`, `archive`, `transferImmediate` to the returned object beside `getById`, `create`, `subscribeStorage`, `isSkuUnique`, `isBarcodeUnique`, `isSerialUnique`. Remove the comment "// subscribeList / subscribeOne / subscribeHistory / update / archive..." now that update/archive are no longer "later iteration."

- [ ] **Step 1.3** Run: `cd C:/Users/DELL/Desktop/warehouse && CI=true npm run build`. Expected: clean build, no new warnings.

- [ ] **Step 1.4 — REPORT** (do not commit).

---

## Task 2 — Dashboard repo: `subscribeStorageCount`

**Role:** firebase-engineer (continuation of Task 1)

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/infra/repositories/firestoreDashboardRepository.js`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/hooks/useDashboardStats.js`

- [ ] **Step 2.1** Add to `firestoreDashboardRepository.js`:

```js
/**
 * Live: items currently in storage (holderType === 'storage', status active).
 * @param {(count: number) => void} onChange
 * @param {(err: Error) => void} onError
 * @returns {() => void}
 */
export function subscribeStorageCount(onChange, onError) {
  const q = query(collection(db, 'assets'), where('holderType', '==', 'storage'));
  return onSnapshot(
    q,
    (snap) => {
      const n = snap.docs.filter((d) => {
        const s = d.data().status;
        return s === 'active' || s === undefined;
      }).length;
      onChange(n);
    },
    onError,
  );
}
```

- [ ] **Step 2.2** Extend `useDashboardStats.js`:
  - Add `subscribeStorageCount` import.
  - Add `const [storageAssets, setStorage] = useState(null);` and a parallel `useEffect` mirroring `subscribeCount(...)` shape.
  - Include `storageAssets` in the loading-completion check and the returned object.
  - Update the JSDoc `DashboardStats` typedef to include `storageAssets: number | null`.

- [ ] **Step 2.3** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 2.4 — REPORT.**

---

## Task 3 — i18n: rename Peripheral/Desktop, add new keys

**Role:** i18n-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/locales/en/warehouse.json`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/locales/ru/warehouse.json`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/locales/hy/warehouse.json`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/locales/en/common.json`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/locales/ru/common.json`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/locales/hy/common.json`

- [ ] **Step 3.1** Rename category labels (id stays `peripheral` and `desktop`; only labels change). Apply to BOTH `warehouse.json` (`categories.*`) AND `common.json` (`category.*`):

| Locale | `peripheral` (was) | `peripheral` (new) | `desktop` (was) | `desktop` (new) |
|---|---|---|---|---|
| en | "Peripheral" | "Accessories" | "Desktop" | "Computer" |
| ru | "Периферия" | "Аксессуары" | "Десктоп" | "Компьютер" |
| hy | "Պերիֆերիա" | "Աքսեսուարներ" | "Համակարգիչ" (unchanged) | "Համակարգիչ" (unchanged) |

- [ ] **Step 3.2** Add the following keys to all three `warehouse.json` files (in the same nested order; show RU as example, mirror in EN/HY):

```json
"sort": {
  "label": "Сортировка",
  "none": "Без сортировки",
  "name": "По названию",
  "category": "По типу",
  "code": "По коду",
  "asc": " ↑",
  "desc": " ↓"
},
"actions": {
  "details": "Детали",
  "edit": "Изменить",
  "delete": "Удалить",
  "transfer": "Передать"
},
"editAsset": {
  "title": "Изменить вещь",
  "save": "Сохранить",
  "cancel": "Отменить"
},
"deleteAsset": {
  "title": "Удалить вещь?",
  "body": "Вещь «{{name}}» будет архивирована. Это действие можно отменить позже.",
  "confirm": "Удалить",
  "cancel": "Отменить"
},
"transferAsset": {
  "title": "Передать вещь",
  "subtitle": "«{{name}}»",
  "holderTypeLabel": "Кому передаём",
  "holderType": { "branch": "Филиалу", "employee": "Сотруднику" },
  "targetLabel": "Получатель",
  "targetPlaceholder": "Имя или название филиала",
  "noteLabel": "Комментарий (необязательно)",
  "submit": "Передать",
  "cancel": "Отменить",
  "trialNotice": "Пробный режим: передача без подтверждения PIN."
}
```

EN equivalents (sort.label "Sort", sort.none "No sorting", sort.name "By name", sort.category "By type", sort.code "By code"; actions.details "Details", actions.edit "Edit", actions.delete "Delete", actions.transfer "Transfer"; editAsset.title "Edit item"; deleteAsset.title "Delete item?", body "Item “{{name}}” will be archived. You can undo this later.", confirm "Delete"; transferAsset.title "Transfer item", holderType.branch "Branch", holderType.employee "Employee", targetPlaceholder "Name or branch name", noteLabel "Note (optional)", submit "Transfer", trialNotice "Trial mode: transfer without PIN confirmation").

HY equivalents (sort.label "Տեսակավորում", sort.none "Առանց տեսակավորման", sort.name "Ըստ անվան", sort.category "Ըստ տեսակի", sort.code "Ըստ կոդի"; actions.details "Մանրամասներ", actions.edit "Փոխել", actions.delete "Ջնջել", actions.transfer "Փոխանցել"; editAsset.title "Փոխել իրը"; deleteAsset.title "Ջնջե՞լ իրը", body "«{{name}}» իրը կարխիվացվի։ Կարող եք ետ կանչել։", confirm "Ջնջել"; transferAsset.title "Փոխանցել իրը", holderType.branch "Մասնաճյուղին", holderType.employee "Աշխատակցին", targetPlaceholder "Անուն կամ մասնաճյուղի անուն", noteLabel "Մեկնաբանություն (ոչ պարտադիր)", submit "Փոխանցել", trialNotice "Փորձնական ռեժիմ՝ առանց PIN հաստատման").

- [ ] **Step 3.3** Add to all three `common.json` files under `dashboard.stats`:
  - en: `"storageAssets": "Items in storage"`
  - ru: `"storageAssets": "Вещей на складе"`
  - hy: `"storageAssets": "Իրեր պահեստում"`

- [ ] **Step 3.4** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 3.5 — REPORT.**

---

## Task 4 — Domain: extend category KEYWORDS

**Role:** domain-modeler

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/domain/categories.js`

- [ ] **Step 4.1** Add the following entries to the `KEYWORDS` map (preserve alphabetical/logical clusters; place near existing electronics keywords):

```js
accessory: 'electronics',
accessories: 'electronics',
аксессуар: 'electronics',
аксессуары: 'electronics',
аксесуар: 'electronics',   // common Russian misspelling
аксесуары: 'electronics',  // common Russian misspelling
```

`computer`, `компьютер`, `desktop` are already mapped — leave as-is.

- [ ] **Step 4.2** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 4.3 — REPORT.**

---

## Task 5 — UI: Sort dropdown in toolbar

**Role:** react-ui-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/WarehousePage.jsx`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/WarehousePage.css` (only if needed for layout; otherwise skip)

- [ ] **Step 5.1** Inside `.warehouse-page__toolbar`, after the `<Input type="search">`, add a `<Select>` bound to a single derived value `sortValue` of shape `${sortKey}-${sortDir}` or `''` when no sort is active. Options:

```jsx
<Select
  value={sortKey ? `${sortKey}-${sortDir}` : ''}
  onChange={(e) => {
    const v = e.target.value;
    if (!v) { setSortKey(null); setSortDir('asc'); return; }
    const [k, d] = v.split('-');
    setSortKey(k);
    setSortDir(d);
  }}
  aria-label={t('sort.label', 'Sort')}
>
  <option value="">{t('sort.none', 'No sorting')}</option>
  <option value="name-asc">{t('sort.name', 'By name')}{t('sort.asc', ' ↑')}</option>
  <option value="name-desc">{t('sort.name', 'By name')}{t('sort.desc', ' ↓')}</option>
  <option value="category-asc">{t('sort.category', 'By type')}{t('sort.asc', ' ↑')}</option>
  <option value="category-desc">{t('sort.category', 'By type')}{t('sort.desc', ' ↓')}</option>
  <option value="sku-asc">{t('sort.code', 'By code')}{t('sort.asc', ' ↑')}</option>
  <option value="sku-desc">{t('sort.code', 'By code')}{t('sort.desc', ' ↓')}</option>
</Select>
```

Add `Select` to the imports from `'../../components/common/Select'` (or barrel).

- [ ] **Step 5.2** Confirm header-click sort still works (it's the same `handleSort` and `sortKey`/`sortDir` state — they read both controls).

- [ ] **Step 5.3** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 5.4 — REPORT.**

---

## Task 6 — UI: WarehouseTable row-actions cell, Name as plain text

**Role:** react-ui-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/WarehouseTable.jsx`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/WarehouseTable.css`

- [ ] **Step 6.1** Update the component signature to accept four optional callbacks:

```js
/**
 * @param {{
 *   ...existing props,
 *   onDetails?: (asset) => void,
 *   onEdit?: (asset) => void,
 *   onDelete?: (asset) => void,
 *   onTransfer?: (asset) => void,
 *   actionLabels?: { details: string, edit: string, delete: string, transfer: string },
 * }} props
 */
```

- [ ] **Step 6.2** Render an extra trailing `<Th aria-label={actionLabels?.details ?? ''} />` (icon-only header is fine; aria-label keeps it accessible). Render an extra trailing `<Td>` per row containing four icon `<Button variant="ghost" size="sm">` (or plain `<button>` with kit `Icon`) — one per non-null callback. Suggested icons: `eye`, `pencil`, `trash`, `arrow-right` — if those exact names aren't in `src/components/icons`, fall back to text labels rather than guessing names. Use `aria-label={actionLabels.details}` etc. on each button so screen readers work; visible label hidden via `Tooltip` if available, otherwise the label is visually hidden.

- [ ] **Step 6.3** Remove the `<Link to={`/warehouse/${asset.id}`}>` wrapper from the `name` cell. Render `asset.name` (or `'—'` fallback) plainly. Keep the `Link` import only if still used elsewhere; if not, drop it.

- [ ] **Step 6.4** CSS — add `.warehouse-table__actions { display: flex; gap: 4px; justify-content: flex-end; }` and ensure the actions column is right-aligned and shrinks to content.

- [ ] **Step 6.5** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 6.6 — REPORT.**

---

## Task 7 — UI: WarehousePage wires actions (Details drawer, Edit drawer, Delete modal, Transfer drawer)

**Role:** react-ui-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/WarehousePage.jsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/AssetForm/EditAssetDrawer.jsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/AssetForm/EditAssetDrawer.css`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/AssetDetailsDrawer.jsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/AssetDetailsDrawer.css`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/DeleteAssetModal.jsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/TransferAssetDrawer.jsx`
- Create: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/TransferAssetDrawer.css`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/components/features/Warehouse/index.js` (re-export the new components)

- [ ] **Step 7.1 — `AssetDetailsDrawer`** — read-only Drawer (`width="md"`) listing every populated field of an asset using `<dl>` markup. Title: `t('asset.title', 'Asset detail')`. Fields shown: name, category (label via `categoryLabelById[asset.category]`), code/sku, model, quantity, condition, holderType + holder.displayName, branchId, warrantyStart/warrantyEnd (formatted YYYY-MM-DD), createdAt, supplier, invoiceNumber. Skip fields whose value is null/empty. No edit controls. Footer: a single Close button.

- [ ] **Step 7.2 — `DeleteAssetModal`** — uses the existing `<Modal size="sm">`. Title from `deleteAsset.title`. Body uses `deleteAsset.body` interpolated with `{{name}}`. Footer: secondary Cancel + danger Confirm. Confirm calls `onConfirm()` which the parent wires to `repo.archive(asset.id)` (NOT hard delete). On success, close + show toast `t('addAsset.created', ...)`-style success message — actually use a new key not yet defined? Reuse existing toast pattern: just close, the realtime list reflects it.

- [ ] **Step 7.3 — `EditAssetDrawer`** — start as a thin wrapper around `QuickAddDrawer` for now: prefill form from the asset and call `repo.update(id, patch)` on save instead of `repo.create`. Implementation note: cleanest path is to extract the QuickAddDrawer body into a shared `<AssetFormBody>` and have both drawers render it. If that refactor is too large for this trial, instead build `EditAssetDrawer` as a *parallel* simple drawer with Name (SearchableSelect or Input), Category (CategoryPicker), Model, Quantity, Condition, Warranty fields — same controls as QuickAdd. **Choose the parallel-drawer approach for the trial pass; mark TODO to deduplicate later.** Save button calls `await repo.update(asset.id, patch)`, then `onClose()`.

- [ ] **Step 7.4 — `TransferAssetDrawer`** — trial variant per spec:

```jsx
// Holder type radio (Branch | Employee), free-text Target name + optional Note.
// On submit: target.id = slugify(targetName) || targetName; target.displayName = targetName.
// branchId rule: if Holder=Branch, branchId = target.id; if Employee, branchId = null
// (TODO iter-2: pass through real branchId for the employee from /users/{uid}.branchId).
function slugify(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[^a-z0-9а-яёա-ֆ\s-]/giu, '').replace(/\s+/g, '-').slice(0, 60) || `target-${Date.now()}`;
}
```

Header subtitle uses `transferAsset.subtitle` interpolated with `asset.name`. Render `t('transferAsset.trialNotice')` as a muted info banner inside the drawer body so the user knows this is the trial flow. Footer: Cancel + primary "Передать". On submit: `await repo.transferImmediate(asset.id, { type, id: slug, displayName: name, branchId, note })`. Then close.

- [ ] **Step 7.5 — `WarehousePage` wiring** — add four pieces of state:

```jsx
const [detailsAsset, setDetailsAsset] = useState(null);
const [editAsset, setEditAsset] = useState(null);
const [deleteAsset, setDeleteAsset] = useState(null);
const [transferAsset, setTransferAsset] = useState(null);
```

Pass these onto `<WarehouseTable>` via `onDetails={setDetailsAsset}` etc. Render the four overlays under the existing `<QuickAddDrawer>`. Each overlay's `open` prop is `Boolean(<state>)`; `onClose` resets the state to `null`. Wire `DeleteAssetModal`'s `onConfirm` to `() => repo.archive(deleteAsset.id).then(() => setDeleteAsset(null))`.

- [ ] **Step 7.6** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 7.7 — REPORT.**

---

## Task 8 — UI: QuickAdd Name field becomes SearchableSelect with free-text

**Role:** react-ui-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/components/common/SearchableSelect/SearchableSelect.jsx`
- Modify: `C:/Users/DELL/Desktop/warehouse/src/components/features/AssetForm/QuickAddDrawer.jsx`

- [ ] **Step 8.1** Extend `SearchableSelect` to support free-text via a new prop `allowFreeText: boolean = false`:
  - Replace the controlled-by-`value` semantics with: when `allowFreeText` is true, `onChange(value)` fires for ANY typed string, not only on option click. The displayed input value follows `value` directly (not `selected?.label`). Picking from the list also calls `onChange(option.value)`.
  - When `allowFreeText` is false, behavior is unchanged.
  - Implementation outline: track a `freeText` mode internally; if `allowFreeText`, the input is always editable, `value` is the truth, and `query`/`open`/`activeIndex` only drive the dropdown filter and keyboard nav.
  - Keyboard: Enter on an active option commits it (calls `onChange(opt.value)` and closes). Enter without active option keeps the typed text and closes.
  - Add a unit test if a `SearchableSelect.test.jsx` exists; if not, the role is allowed to skip the test (test-engineer will add one).

- [ ] **Step 8.2** In `QuickAddDrawer.jsx`, replace the Name field block (the `<Input list="quick-add-name-suggestions"> + <datalist>` pair) with:

```jsx
<SearchableSelect
  allowFreeText
  options={nameSuggestions.map((n) => ({ value: n, label: n }))}
  value={form.name}
  onChange={(v) => update('name', v)}
  placeholder=""
  emptyLabel={t('addAsset.fields.empty', 'Nothing matches')}
  ariaLabel={t('addAsset.fields.name', 'Name')}
/>
```

Drop the now-unused `<datalist>` and the `list="quick-add-name-suggestions"` attribute. Keep the `nameSuggestions` memo (it now feeds the SearchableSelect options).

Add the import: `import { SearchableSelect } from '../../common/SearchableSelect';`.

- [ ] **Step 8.3** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 8.4 — REPORT.**

---

## Task 9 — UI: Dashboard "Items in storage" stat card

**Role:** react-ui-engineer

**Files:**
- Modify: `C:/Users/DELL/Desktop/warehouse/src/pages/DashboardPage/DashboardPage.jsx`

- [ ] **Step 9.1** Add a new `<StatCard>` between "Total assets" and "Pending transfers":

```jsx
<StatCard
  label={t('dashboard.stats.storageAssets')}
  value={stats.storageAssets}
  icon="inventory"
/>
```

(`stats.storageAssets` comes from Task 2's hook addition. If `inventory` doesn't render distinctly from the existing total-assets card, use `'package'` or any other available icon name; the i18n label is what disambiguates.)

- [ ] **Step 9.2** Run: `CI=true npm run build`. Expected clean.

- [ ] **Step 9.3 — REPORT.**

---

## Task 10 — Verification gate

**Role:** orchestrator (not a subagent — this is the final gate)

- [ ] **Step 10.1** Run from `C:/Users/DELL/Desktop/warehouse`:
  - `CI=true npm run build`
  - `CI=true npm test -- --watchAll=false`
- [ ] **Step 10.2** Confirm: build clean, no new warnings, all tests pass.
- [ ] **Step 10.3** **Do NOT commit.** Report back to the user with the diff summary, manual test plan, and deferred-items list.

---

## Deliberately deferred to Iteration 2 (record in delivery report)

1. **Pending+PIN transfer flow** — `transfers/` collection writes, recipient confirmation UI, PIN entry. The trial uses `transferImmediate` only.
2. **Movements / asset-history log** — every transfer should write a `movements/` (or `assets/{id}/history/`) doc. Skipped this pass; the TODO comment in `transferImmediate` flags it.
3. **Real Branch / Employee data sources** — Transfer drawer currently free-text only. Iteration 2 swaps in `useBranches` and a future `useEmployees` hook with `SearchableSelect` constrained to existing options (no `allowFreeText` for the target).
4. **Edit drawer reuses QuickAdd body** — the parallel drawer in Task 7.3 has duplicated form code; Iteration 2 should extract `<AssetFormBody>` and have both drawers compose it.
5. **Hard delete vs soft delete** — currently always soft-delete via `archive`. Confirm with user whether super_admin should ever hard-delete.
6. **Firestore rules** — `update` and `archive` and now `transferImmediate` need rule coverage. Currently rules are still DRAFT. Schedule rules write + emulator tests as its own task.
7. **Toast feedback** for archive / transfer success — currently the realtime list just refreshes; explicit toasts would be nicer.
