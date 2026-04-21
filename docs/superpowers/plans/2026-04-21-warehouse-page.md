# Warehouse page + Group Transfer — master plan

**Parent concept:** `docs/superpowers/plans/2026-04-21-asset-management-architecture.md` (APPROVED 2026-04-21).
**Prerequisite step:** `docs/superpowers/plans/2026-04-21-step-1-drawer-and-rename.md` (DONE — Drawer + rename shipped on branch `feature/iteration-1-core-ui`).
**Status:** DRAFT, begun 2026-04-21. User authorized a large multi-phase execution; natural-boundary stop is allowed.
**Branch:** `feature/iteration-1-core-ui` (current). No commits inside this plan — work is delivered uncommitted for user review. Don't mention git in reports unless the user brings it up.

---

## Non-negotiables

- **No new npm packages.**
- **No git commits / pushes / resets** unless the user explicitly says `git` / `commit` / `push`.
- All new user-facing strings go through `t()` and live in `src/locales/{hy,en,ru}/common.json`.
- No Firestore imports outside `src/infra/**`. UI consumes via hooks that consume repositories.
- Every mutation path has a user-visible error surface (toast).
- Tailwind is still NOT configured — continue using co-located CSS with the existing design tokens (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--transition-*`).

## Ground-truth inventory (verified 2026-04-21 at plan time)

| Asset | State |
|---|---|
| `src/components/common/Drawer/*` | EXISTS (Drawer.jsx + css + tests). Shipped in Step 1. |
| `src/components/common/SearchableSelect/` | EMPTY FOLDER. No export in `common/index.js`. Must be built from scratch. |
| `src/components/features/AssetDetail/` | EMPTY FOLDER |
| `src/components/features/AssetForm/` | EMPTY FOLDER |
| `src/components/features/AssetList/` | EMPTY FOLDER |
| `src/components/features/EntityManager/` | not inspected yet; out-of-scope for this plan |
| `src/infra/repositories/firestoreAssetRepository.js` | **DOES NOT EXIST**. Only the domain typedef `AssetRepository.js` is present. Adapter must be written. |
| `src/infra/repositories/firestoreTransferRepository.js` | **DOES NOT EXIST**. Only domain typedef `TransferRepository.js`. Adapter must be written. |
| `src/infra/repositories/firestoreDashboardRepository.js` | exists — used by DashboardPage. Reference example. |
| `src/infra/repositories/firestoreUserRepository.js` | exists — used for profile + user lookup. |
| Hooks | `useAuth`, `useBranchesOverview`, `useDashboardStats`, `useRecentActivity`. No `useAssets`, `useUsers`, `useBranches`, `useDepartments`, `useSettingsCategories` yet. |
| `src/pages/WarehousePage/WarehousePage.jsx` | placeholder only (PageHeader + EmptyState). |
| `src/config/nav.js` — Dashboard roles | `['super_admin']` — MUST become `['admin','super_admin']` per user direction. |
| `src/components/routing/AppRouter.jsx` — `/dashboard` | `<RequireRole role="super_admin">` — MUST become `roles={['admin','super_admin']}`. |
| `src/pages/HomePage/HomePage.test.jsx` | asserts admin does NOT see Dashboard (line 83). Must be flipped. |
| `firestore.rules` | present but not yet aligned with new collections; out of scope for this plan except where noted. |
| `settings/global_lists/categories` | target Firestore doc. Existence on the live project is unconfirmed; seed path is documented below. |

This inventory is authoritative for planning; the plan does not depend on anything outside it.

---

## Phases & acceptance criteria

### Phase 1 — Dashboard role fix (DONE in this session)

**Goal:** admin sees Dashboard too. Implemented same turn as plan-write; details here for the record.

**Files modified:**
- `src/config/nav.js` — `dashboard.roles` → `['admin','super_admin']`.
- `src/components/routing/AppRouter.jsx` — `<RequireRole role="super_admin">` on `/dashboard` → `<RequireRole roles={['admin','super_admin']}>`.
- `src/pages/HomePage/HomePage.test.jsx` — `admin` test now EXPECTS Dashboard tile; `plain user` still expects no Dashboard.

**Acceptance:**
- `CI=true npx react-scripts test --watchAll=false` → PASS.
- Admin user signed in sees the `Dashboard` sidebar entry + Home tile.
- Plain user still redirected away from `/dashboard` to `/forbidden`.

### Phase 2 — Domain + infra repositories

**Goal:** make `Asset` and `Transfer` actually reachable from UI. Without this nothing in Phase 3+ can subscribe to data.

**2a — AssetRepository domain additions**
- Extend `src/domain/repositories/AssetRepository.js`:
  - Add `subscribeList(filter, onChange, onError)` — already declared in the contract. Verify filter fields cover: `holderType`, `branchId`, `departmentId`, `category`, `status`, `holderId`.
  - Add JSDoc typedef `AssetUpdateInput` (same shape as create, all fields optional).
  - No behavioral changes to `toLocalizedText` / `toAssetSourceLanguage`.

**2b — `firestoreAssetRepository.js`**
- New file: `src/infra/repositories/firestoreAssetRepository.js`.
- Exports an object that implements the domain `AssetRepository` contract:
  - `subscribeList(filter, onChange, onError)` — `onSnapshot` over `collection(db, 'assets')` with `where()` clauses from filter, default `status='active'`, `orderBy('updatedAt','desc')`, `limit(200)` (pagination in Phase 3 via cursors).
  - `subscribeOne(id, onChange, onError)` — `onSnapshot(doc(db,'assets',id))`.
  - `subscribeHistory(assetId, onChange, onError)` — `onSnapshot` over `assets/{id}/events` ordered by `at desc`.
  - `create(input)` — `addDoc` + `serverTimestamp()` on `createdAt`/`updatedAt`, `createdBy`/`updatedBy` from `auth.currentUser.uid`.
  - `update(id, patch)` — `updateDoc` with `updatedAt: serverTimestamp()`, `updatedBy: uid`.
  - `archive(id)` — `updateDoc` with `status: 'archived', retiredAt: serverTimestamp(), updatedAt, updatedBy`.
- Adapter strips Firestore `Timestamp` → `Date` in the mapper. Mapper lives in the same file; pure function `mapDocToAsset(docSnap)`.

**2c — TransferRepository domain additions**
- Extend `src/domain/repositories/TransferRepository.js`:
  - Add method `createBatch(input): Promise<TransferCreateResult>` — same shape as `createTransfer`, but `assetIds` is always a non-empty array and everything commits atomically via `writeBatch`.
  - Note: `createTransfer` already supports `assetIds: string[]`, so `createBatch` can be a thin alias that enforces non-empty + adds a group-marker flag on the transfer doc (`isGroup: true`) for audit reporting.

**2d — `firestoreTransferRepository.js`**
- New file: `src/infra/repositories/firestoreTransferRepository.js`.
- Implements:
  - `subscribeIncoming(uid)`, `subscribeOutgoing(uid)`, `subscribeRecentForUser(uid, max)` — each is an `onSnapshot` on `collection(db,'transfers')` with `where('to.id','==',uid)` / `where('from.id','==',uid)` / `where('participants','array-contains',uid)` (schema decision; see rules below).
  - `createTransfer(input)` — writes transfer doc, sets `pendingTransferId` on each asset in `assetIds` inside a `writeBatch`.
  - `createBatch(input)` — same as `createTransfer` but enforces `assetIds.length >= 1`, sets `isGroup:true`, and on the server also flips `holderType`/`holder` on each asset immediately (Group Transfer is INSTANT — no PIN). Decision rationale: for internal handover the user explicitly said "одна транзакция" — no 2-phase PIN flow for group transfers.
  - `confirmTransfer`, `rejectTransfer`, `cancelTransfer` — still available for the single-asset PIN flow (not used in this phase but kept in the contract for completeness).

**2e — Seed for settings/global_lists**
- `src/infra/seed/seedCategories.js` — a small helper (callable from a dev-time page or jest snapshot) that writes `settings/global_lists/categories` with:
  ```
  laptop    { labelI18n: { hy: 'Նոութբուք',  en: 'Laptop',   ru: 'Ноутбук' } }
  monitor   { labelI18n: { hy: 'Մոնիտոր',    en: 'Monitor',  ru: 'Монитор' } }
  keyboard  { labelI18n: { hy: 'Ստեղնաշար', en: 'Keyboard', ru: 'Клавиатура' } }
  chair     { labelI18n: { hy: 'Աթոռ',       en: 'Chair',    ru: 'Стул' } }
  desk      { labelI18n: { hy: 'Սեղան',      en: 'Desk',     ru: 'Стол' } }
  printer   { labelI18n: { hy: 'Տպիչ',       en: 'Printer',  ru: 'Принтер' } }
  ```
- UI must fall back to these 6 values if the doc is missing (client-side DEFAULT_CATEGORIES constant in `src/config/defaultCategories.js`).

**2f — Tests**
- `firestoreAssetRepository.test.js` — mock Firestore (`jest.mock('firebase/firestore', …)`), assert `subscribeList` builds the right query, `create`/`update`/`archive` write expected payloads.
- `firestoreTransferRepository.test.js` — same pattern; `createBatch` writes one transfer doc + N asset updates in one `writeBatch.commit()`.

**Acceptance for Phase 2:** all unit tests green. No UI yet — this phase ends with repositories callable but unused.

### Phase 3 — Warehouse page (Variant 1 core)

**Goal:** `/warehouse` becomes the primary workbench: list, filter, open detail, create, edit, archive, single-asset transfer.

**New components:**
- `src/hooks/useWarehouseAssets.js` — takes a `filter` object, returns `{ assets, loading, error }`, subscribes via `AssetRepository.subscribeList`.
- `src/hooks/useSettingsCategories.js` — subscribes to `settings/global_lists/categories` with default fallback.
- `src/components/common/SearchableSelect/*` — MVP SearchableSelect: input + dropdown with filterable options, keyboard nav (ArrowDown/ArrowUp/Enter/Escape), optional `footer` slot (for `+ Create new` row). Co-located CSS + tests.
- `src/components/features/Warehouse/WarehouseFilters.jsx` — search box (by SKU/name/serial) + Category SearchableSelect + Condition Select + Holder multi-select.
- `src/components/features/Warehouse/WarehouseViewSwitcher.jsx` — segmented control: `storage` / `all` / `assigned`.
- `src/components/features/Warehouse/AssetRow.jsx` — row renderer consuming the shared `Table` primitives.
- `src/components/features/Warehouse/AssetDetailsDrawer.jsx` — Drawer with asset details + action buttons (Edit, Transfer, Archive).
- `src/components/features/Warehouse/AssetFormDrawer.jsx` — Drawer used for both create and edit. Props: `mode: 'create'|'edit'`, `asset?: Asset`, `onSaved`, `onClose`.
- `src/components/features/Warehouse/QuickTransferDrawer.jsx` — single-asset transfer: pick receiver (type + SearchableSelect) → confirm.
- `src/components/icons/index.jsx` — add `plus`, `group-transfer`, `archive`, `edit` if missing (reuse existing if present).

**Page assembly (`WarehousePage.jsx`):**
- PageHeader with actions: `[+ Add asset]` (RoleGate admin+), `[Group transfer]` (RoleGate admin+), view switcher.
- FilterBar (controlled; local state).
- Table with columns: Photo placeholder, SKU, Name (+description trunc), Category Badge, Condition Badge, Holder, `…` row menu (Edit / Transfer / Archive).
- Pagination: `Load more` button (simplest; cursor via `startAfter`).
- EmptyState with CTA `+ Add first asset` when list is empty AND no active filters.

**Behavior details:**
- Row click → opens AssetDetailsDrawer (read mode).
- Row menu `Edit` → opens AssetFormDrawer in `edit` mode pre-filled.
- Row menu `Transfer` → opens QuickTransferDrawer for that single asset.
- Row menu `Archive` → confirmation modal ("Архивировать актив <name>?") → `archive(id)` → toast + row disappears (default filter is `status='active'`).

**Tests:**
- `WarehousePage.test.jsx` — smoke: renders header + action buttons (role-gated); renders rows from mocked hook; opens details drawer on row click.
- Hook tests mock the repository directly.
- Drawer-level tests: AssetFormDrawer create submits correct input; QuickTransferDrawer calls `createTransfer`.

**Out of scope for Phase 3 (deferred to later phases):**
- Group transfer — Phase 4.
- Checkbox/bulk selection — Phase 5.
- Creating new categories from within the form — Phase 6.

### Phase 4 — Group Transfer

**New components:**
- `src/components/features/Warehouse/GroupTransferDrawer.jsx` — 3-step wizard inside Drawer:
  1. **Receiver:** segmented control (User / Department / Branch) + SearchableSelect loading from the matching collection (`users`, `settings/global_lists/departments`, `branches`).
  2. **Assets:** search + filter + list view. Each row has a `+` button that pushes into the cart; cart rendered as a chip row ABOVE the list or as a right-side column inside the Drawer (decision: right-side column on ≥768px, bottom sheet on mobile).
  3. **Confirm:** summary — `Transfer {N} assets → {receiver name}`, notes field, `[Cancel] [Confirm]` footer.
- `src/components/features/Warehouse/AssetCart.jsx` — reusable cart with add/remove and count.
- Hook `src/hooks/useEmployeesForPicker.js`, `useDepartmentsForPicker.js`, `useBranchesForPicker.js` — thin subscribers returning `{ items, loading, error }`.

**Submit:** `TransferRepository.createBatch({ from: 'storage'|uidOfCurrentHolder, to: <receiver>, assetIds, isGroup:true, reason, notes })`. Optimistic UI: rows disappear from the warehouse view immediately; on error, toast + cart restored.

**Tests:**
- Wizard flow test: advance Step 1 → 2 → 3, add 3 assets, confirm; verify `createBatch` called with correct payload.
- Receiver-type switch clears the cart? **Decision: no.** Cart persists; only the receiver is re-picked.

### Phase 5 — Checkbox bulk-mode

**Changes to `Table`:** add optional `selectable` prop with callbacks `{ selectedIds, onToggle, onToggleAll }`. When true, adds a leading checkbox column + header "select all".

**New `BulkActionBar`:** sticky bottom bar that appears when `selectedIds.length > 0`. Buttons: `Transfer` (opens `GroupTransferDrawer` with cart pre-filled + receiver step visible), `Archive` (confirm modal with list preview → `writeBatch` archive all).

**Trigger:** a toggle button in WarehousePage header next to the view switcher turns selection mode on.

**Tests:** select 3 rows → BulkActionBar appears → Archive → all 3 disappear. Select 2 rows → Transfer → GroupTransferDrawer opens pre-populated with 2 assets.

### Phase 6 — Dynamic categories in the asset form

- In `AssetFormDrawer`, replace the plain Select with `SearchableSelect` wired to `useSettingsCategories()`.
- Dropdown footer slot renders `+ Create new category` ONLY when `profile.role === 'super_admin'`.
- Clicking footer opens `CreateCategoryModal` (new; layered above the drawer). Fields: code (latin, regex `^[a-z][a-z0-9_]*$`), label EN (required), label RU (optional), label HY (optional).
- Submit → `setDoc(doc(db,'settings/global_lists/categories',code), { labelI18n, createdAt, createdBy })` → modal closes → new option appears + auto-selected.

**Tests:** modal requires EN label, validates code regex, calls the writer with normalized payload.

### Phase 7 — i18n keys

New namespace blocks in `src/locales/{hy,en,ru}/common.json` under top-level keys:

- `warehouse.*`
  - `title`, `addAsset`, `groupTransfer`, `viewSwitcher.storage`, `viewSwitcher.all`, `viewSwitcher.assigned`
  - `columns.sku`, `columns.name`, `columns.category`, `columns.condition`, `columns.holder`
  - `filters.search.placeholder`, `filters.category.all`, `filters.condition.all`, `filters.holder.all`
  - `emptyState.title`, `emptyState.description`, `emptyState.cta`
  - `rowMenu.edit`, `rowMenu.transfer`, `rowMenu.archive`
  - `archiveConfirm.title`, `archiveConfirm.description`, `archiveConfirm.confirm`, `archiveConfirm.cancel`
- `transfer.*`
  - `single.title`, `single.step.receiver`, `single.cta`
  - `group.title`, `group.step.receiver`, `group.step.assets`, `group.step.confirm`, `group.cartHeader`, `group.cartEmpty`, `group.confirm.summary`, `group.confirm.confirm`, `group.success`, `group.error`
  - `receiverType.user`, `receiverType.department`, `receiverType.branch`
- `assetForm.*` — labels for every field, submit, cancel.
- `condition.new`, `condition.good`, `condition.fair`, `condition.broken`.
- `holderType.user`, `holderType.department`, `holderType.storage`.

Every key gets hy / en / ru values. EN is source of truth; use plain readable English, then translate to RU (Russian) and HY (Armenian — reuse existing style in the file).

### Phase 8 — Verify

Run from `C:/Users/DELL/Desktop/warehouse`:
```
CI=true npx react-scripts test --watchAll=false 2>&1 | tail -40
npm run build 2>&1 | tail -25
```
Expected: green tests; build with no new warnings.

Manual smoke checklist in browser:
1. Sign in as admin → Dashboard tile visible → `/dashboard` loads.
2. Sign in as admin → `/warehouse` → `+ Add asset` → create a chair → appears in list.
3. Click row → Drawer → Edit → change condition → Save → row updates.
4. Row menu → Archive → row disappears; switch view to `all` → archived row visible with archived badge.
5. `[Group transfer]` → pick user → add 3 assets to cart → Confirm → all 3 disappear from `storage` view; appear in the selected user's list (test against `/employees/:uid` if available; otherwise verify via Firestore console).
6. Enable selection mode → check 2 rows → BulkActionBar → Transfer → GroupTransferDrawer opens pre-populated.
7. Sign in as super_admin → open AssetFormDrawer → Category dropdown → `+ Create new category` → fill code + labels → Save → new option selectable.

---

## Rollback

All changes are uncommitted. `git restore .` + removing newly created files under:
- `src/infra/repositories/firestoreAssetRepository.js`, `firestoreTransferRepository.js`
- `src/components/common/SearchableSelect/*`
- `src/components/features/Warehouse/*`
- `src/hooks/useWarehouseAssets.js`, `useSettingsCategories.js`, `useEmployeesForPicker.js`, `useDepartmentsForPicker.js`, `useBranchesForPicker.js`
- Locale additions (revert `src/locales/{hy,en,ru}/common.json`)

returns to baseline. `firestore.rules`, `.env.local`, `package.json` stay untouched throughout.

---

## Execution order (implementer dispatch — sequential only)

Per orchestrator matrix in `AGENTS_WAREHOUSE_ORCHESTRATOR.md` §8.2:

1. **Phase 1** — `react-ui-engineer` → Dashboard role widen + test flip. `test-engineer` gate. **[DONE this turn]**
2. **Phase 2** — `firebase-engineer` → repositories + tests. `test-engineer` gate.
3. **Phase 3** — `react-ui-engineer` → SearchableSelect + warehouse shell + hooks + single-asset drawers. `test-engineer` gate. `spec-reviewer` + `code-quality-reviewer`.
4. **Phase 4** — `react-ui-engineer` → GroupTransferDrawer + AssetCart. `test-engineer` gate.
5. **Phase 5** — `react-ui-engineer` → Table `selectable` + BulkActionBar. `test-engineer` gate.
6. **Phase 6** — `react-ui-engineer` → CreateCategoryModal + wiring. `test-engineer` gate. `security-reviewer` (writes to settings/*).
7. **Phase 7** — `i18n-engineer` → i18n keys added for every user-facing string introduced by phases 3–6. `test-engineer` gate.
8. **Phase 8** — final verification gate.

Natural pause-points: after Phase 1, after Phase 2, after Phase 3, after Phase 4, after Phase 6. Each is a clean, testable stopping place.
