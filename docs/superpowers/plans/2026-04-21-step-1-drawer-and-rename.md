# Step 1 — Drawer component + Sidebar/routes rename

**Parent plan:** `docs/superpowers/plans/2026-04-21-asset-management-architecture.md` (APPROVED 2026-04-21)
**Branch:** `feature/iteration-1-core-ui` (current)
**Status:** EXECUTING 2026-04-21.
**Git discipline:** implementers do NOT commit/push/checkout/reset. Only `git status/log/diff` for awareness. Work is delivered uncommitted for user review.
**Goldenrule for super_admin:** no hardcoded categories / statuses / departments / brands — everything lives in `settings/*` or dedicated collections. Step 1 does not touch those; just flagged so every implementer keeps it in mind.

## Objective

Infrastructure-only step:

1. Introduce a new reusable `Drawer` common component (side-panel + mobile full-screen modal fallback).
2. Rename sidebar items / routes / page folders / i18n keys from the old scheme (inventory/transfers/structure/users/admin-settings) to the approved scheme (warehouse/employees/branches/settings).
3. Prepare domain typedefs for the next steps: extend `User.status` enum, document `Asset.holderType='storage' + branchId` convention, introduce `ReturnChecklist` entity + repository interface (JSDoc only, NO Firestore code yet, NO rules edits yet).

**Not in scope:** Warehouse/Employees/Branches real logic (stays placeholders). No new npm packages. No firestore.rules changes. No commits.

## Baseline (verified 2026-04-21)

- `npm test -- --watchAll=false` → 14 suites / 79 tests / PASS.
- Working tree: clean except for untracked `docs/…/2026-04-21-asset-management-architecture.md`, `.npmrc`, `src/i18n/`, `src/locales/`, `src/utils/` (not related to Step 1).
- `package.json` / `package-lock.json` are already modified (earlier work) — we do NOT modify them further in Step 1.

## Current state of affected surface (inventory of reality, not a wish list)

- `src/components/routing/AppRouter.jsx` — routes `/`, `/dashboard`, `/inventory`, `/transfers`, `/structure`, `/licenses`, `/admin/users`, `/admin/settings`, `/profile`, `*`.
- `src/config/nav.js` — `NAV_ITEMS` array with keys `dashboard, inventory, transfers, structure, licenses, users, settings` driving BOTH Sidebar and HomePage tiles.
- `src/components/layout/Sidebar.jsx` — iterates `visibleNavItems(role)` and renders `t('nav.'+key)` + `Icon name={item.icon}`.
- `src/pages/HomePage/HomePage.jsx` — iterates the same list, renders tiles from `nav.<key>` and `nav.descriptions.<key>`.
- Four placeholder pages (InventoryPage, StructurePage, UsersPage, TransfersPage) are near-identical — PageHeader + EmptyState reading from `nav.<sectionKey>` and `nav.descriptions.<sectionKey>`.
- `src/components/common/Modal/*` — existing modal with backdrop, Escape handling, portal, focus-on-open. Drawer will borrow the shape (portal, Escape, backdrop, focus-on-open) but with side-anchored panel + slide animation.
- `src/components/icons/index.jsx` — has glyphs for `inventory, transfers, structure, users, settings, dashboard, licenses`. Need new keys `warehouse, branches, employees` (alias to existing SVG bodies to avoid design churn in Step 1 — fresh glyphs can follow later).
- `src/domain/locales.js`, `src/domain/repositories/{UserRepository,AssetRepository,AuthRepository,TransferRepository}.js` — typedefs only, no runtime infra.
- `src/locales/{en,ru,hy}/common.json` — carry `nav.*` and `nav.descriptions.*` keys for all current nav entries.
- No `src/domain/entities/` folder exists yet — new typedef files for Step 1's `ReturnChecklist` must create it.
- `src/pages/HomePage/HomePage.test.jsx` — hard-codes the English labels "Inventory", "Transfers", "Structure", "Users" etc. Will break after rename; must be updated.

## Rename roadmap (authoritative table)

| Domain | Old | New |
|---|---|---|
| Route | `/inventory` | `/warehouse` |
| Route | `/structure` | `/branches` |
| Route | `/admin/users` | `/employees` (role gate: `admin` + `super_admin`) |
| Route | `/admin/settings` | `/settings` (role gate: `super_admin`) |
| Route | `/transfers` | REMOVED |
| Page folder | `src/pages/InventoryPage/` | `src/pages/WarehousePage/` |
| Page folder | `src/pages/StructurePage/` | `src/pages/BranchesPage/` |
| Page folder | `src/pages/UsersPage/` | `src/pages/EmployeesPage/` |
| Page folder | `src/pages/TransfersPage/` | DELETED |
| Component | `InventoryPage` | `WarehousePage` |
| Component | `StructurePage` | `BranchesPage` |
| Component | `UsersPage` | `EmployeesPage` |
| CSS class prefix | `.placeholder-page` | unchanged (shared pattern, keep as-is in the three remaining pages' CSS files) |
| i18n key | `nav.inventory` | `nav.warehouse` |
| i18n key | `nav.structure` | `nav.branches` |
| i18n key | `nav.users` | `nav.employees` |
| i18n key | `nav.transfers` | REMOVED |
| i18n key | `nav.descriptions.inventory` | `nav.descriptions.warehouse` |
| i18n key | `nav.descriptions.structure` | `nav.descriptions.branches` |
| i18n key | `nav.descriptions.users` | `nav.descriptions.employees` |
| i18n key | `nav.descriptions.transfers` | REMOVED |
| Icon name | `inventory` (kept, still referenced nowhere) | keep legacy SVG, ALSO add `warehouse` alias with same paths |
| Icon name | `structure` | keep, ALSO add `branches` alias |
| Icon name | `users` | keep, ALSO add `employees` alias |
| Nav item key | `inventory` | `warehouse` |
| Nav item key | `structure` | `branches` |
| Nav item key | `users` | `employees` (roles: `['admin','super_admin']`) |
| Nav item key | `settings` | `settings` (path changes to `/settings`) |
| Nav item key | `transfers` | REMOVED |

### Final Sidebar order (6 items, role-filtered)
1. `dashboard` (super_admin only)
2. `warehouse` (all)
3. `employees` (admin + super_admin)
4. `branches` (admin + super_admin)
5. `licenses` (all)
6. `settings` (super_admin only)

HomePage tile grid follows the same order automatically (driven by `NAV_ITEMS`).

## i18n translations (to seed)

| Key | en | ru | hy |
|---|---|---|---|
| `nav.warehouse` | Warehouse | Склад | Պահեստ |
| `nav.employees` | Employees | Сотрудники | Աշխատակիցներ |
| `nav.branches` | Branches | Филиалы | Մասնաճյուղեր |
| `nav.descriptions.warehouse` | Assets on hand and issuing | Склад вещей и выдача | Պահեստ և տրամադրումներ |
| `nav.descriptions.employees` | Staff, assigned assets and returns | Сотрудники и их активы | Աշխատակիցներ և նրանց գույքը |
| `nav.descriptions.branches` | Locations and on-site inventory | Филиалы и размещение | Մասնաճյուղեր և տեղակայում |

Remove the four keys under the old names (`nav.inventory`, `nav.transfers`, `nav.structure`, `nav.users`) AND their matching `nav.descriptions.*`. Everything else in `common.json` stays.

## Tasks — dependency-ordered (execute sequentially)

Each task is handled by one implementer role. After EVERY implementer, `test-engineer` gates progress. No implementer proceeds if the previous `test-engineer` report is not PASS.

### Task A — `domain-modeler` · preparatory domain typedefs

**Paths to create:**
- `C:/Users/DELL/Desktop/warehouse/src/domain/entities/ReturnChecklist.js` (new — JSDoc + exported narrowers)

**Paths to modify:**
- `C:/Users/DELL/Desktop/warehouse/src/domain/repositories/UserRepository.js` — extend `UserStatus` enum to `'active' | 'blocking' | 'blocked' | 'archived'`; update `USER_STATUSES` frozen array; update `toUserStatus` to fall back to `'blocked'` for unknown input (safe lockout default); update JSDoc.
- `C:/Users/DELL/Desktop/warehouse/src/domain/repositories/AssetRepository.js` — add a JSDoc note block above the `Asset` typedef documenting the convention: "Assets physically stored at a branch carry `holderType='storage'` together with a non-null `branchId`. No separate `'branch'` holderType is introduced; this keeps the enum small." Do NOT change the enum.
- `C:/Users/DELL/Desktop/warehouse/src/domain/repositories/` — create `ReturnChecklistRepository.js` (new file) with JSDoc interface: methods `create(input)`, `get(id)`, `update(id, patch)`, `listForUser(userId, onChange, onError) => unsubscribe`, `close(id)`.

**Constraints:**
- JSDoc only. No Firestore imports. No rules edits.
- Do NOT touch `firestore.rules`.
- Do NOT modify any UI code.
- Do NOT install packages.
- Do NOT commit.
- Report files changed with absolute paths.

**Verification the implementer must run:**
```
cd C:/Users/DELL/Desktop/warehouse && CI=true npx react-scripts test --watchAll=false 2>&1 | tail -20
```

### Task B — `react-ui-engineer` · Drawer component

**Paths to create:**
- `C:/Users/DELL/Desktop/warehouse/src/components/common/Drawer/Drawer.jsx`
- `C:/Users/DELL/Desktop/warehouse/src/components/common/Drawer/Drawer.css`
- `C:/Users/DELL/Desktop/warehouse/src/components/common/Drawer/index.js`
- `C:/Users/DELL/Desktop/warehouse/src/components/common/Drawer/Drawer.test.jsx`

**Paths to modify:**
- `C:/Users/DELL/Desktop/warehouse/src/components/common/index.js` — export `Drawer`.

**Component contract (props):**
- `open: boolean` — required.
- `onClose: () => void` — required.
- `title?: ReactNode` — header title.
- `side?: 'right' | 'left'` — default `'right'`.
- `width?: 'sm' | 'md' | 'lg'` — default `'md'`. Map: sm ≈ 360px, md ≈ 480px, lg ≈ 640px.
- `footer?: ReactNode` — optional footer slot (same pattern as `Modal`).
- `dismissOnBackdrop?: boolean` — default `true`.
- `className?: string`.
- `'aria-label'?: string`.
- `children: ReactNode`.

**Behavior:**
- Renders via `createPortal` into `document.body`.
- Backdrop under the panel; clicking backdrop calls `onClose` (when dismiss flag true).
- `Escape` key (attached with `document.addEventListener('keydown', …)`) calls `onClose`.
- Focus management: on open, move focus to the first focusable element inside the panel (fall back to the panel itself); on close, restore focus to the previously-focused element (mirror `Modal`'s pattern).
- Body scroll lock while open (`document.body.style.overflow = 'hidden'`), restored on close.
- **Focus trap:** inside the panel, Tab / Shift+Tab cycles focusable elements. Implement inline — wrap first+last focusables and loop on Tab at the boundary. No new dependency. The existing `Modal` does NOT trap; `Drawer` DOES (stricter, per task).
- Slide-in animation from the chosen side.
- Role: `dialog` + `aria-modal="true"`. `aria-labelledby` when `title` is a string; else `aria-label` fallback.

**Responsive rule:**
- Media query `@media (max-width: 767px)` → Drawer becomes a full-screen modal: width 100vw, height 100vh, no slide-from-side, fade-in. (Spec: MVP simplification agreed by user.)

**Tests (co-located, `Drawer.test.jsx`):**
1. Renders nothing when `open={false}`.
2. Renders title + children when `open`.
3. Escape key calls `onClose`.
4. Backdrop click calls `onClose` when `dismissOnBackdrop` is true (default).
5. Backdrop click does NOT call `onClose` when `dismissOnBackdrop={false}`.
6. Close button in header calls `onClose`.
7. Focus is moved inside the panel on open (smoke: assert first focusable element is `document.activeElement` after open).
8. Tab on the last focusable element inside the drawer loops back to the first (focus trap smoke).

Use the same Jest patterns already in `Modal.test.jsx` (dispatch `KeyboardEvent` on `document` for Escape; `userEvent.click` for mouse interactions).

**Constraints:**
- No new npm dependency.
- Use existing design tokens from the app stylesheet (reuse variables like `--color-bg-surface`, `--shadow-lg`, `--transition-fast`, `--radius-lg`, `--space-*`).
- Keep CSS file pattern consistent with `Modal.css`.
- No commits.

**Verification:**
```
cd C:/Users/DELL/Desktop/warehouse && CI=true npx react-scripts test --watchAll=false 2>&1 | tail -20
cd C:/Users/DELL/Desktop/warehouse && npm run build 2>&1 | tail -15
```

### Task C — `react-ui-engineer` · Icons + Nav config + Routes + Sidebar + pages rename

This is the biggest mechanical change. One implementer handles the full rename atomically so we never observe a broken intermediate tree.

**Paths to create:**
- `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/WarehousePage.jsx` (clone of InventoryPage with renamed component + renamed i18n keys)
- `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/WarehousePage.css` (copy of InventoryPage.css)
- `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/index.js`
- `C:/Users/DELL/Desktop/warehouse/src/pages/BranchesPage/BranchesPage.jsx`
- `C:/Users/DELL/Desktop/warehouse/src/pages/BranchesPage/BranchesPage.css`
- `C:/Users/DELL/Desktop/warehouse/src/pages/BranchesPage/index.js`
- `C:/Users/DELL/Desktop/warehouse/src/pages/EmployeesPage/EmployeesPage.jsx`
- `C:/Users/DELL/Desktop/warehouse/src/pages/EmployeesPage/EmployeesPage.css`
- `C:/Users/DELL/Desktop/warehouse/src/pages/EmployeesPage/index.js`

**Paths to delete (after new files are in place):**
- `C:/Users/DELL/Desktop/warehouse/src/pages/InventoryPage/` (whole folder: .jsx, .css, index.js)
- `C:/Users/DELL/Desktop/warehouse/src/pages/StructurePage/` (whole folder)
- `C:/Users/DELL/Desktop/warehouse/src/pages/UsersPage/` (whole folder)
- `C:/Users/DELL/Desktop/warehouse/src/pages/TransfersPage/` (whole folder, route fully removed)

**Paths to modify:**
- `C:/Users/DELL/Desktop/warehouse/src/components/icons/index.jsx` — add `warehouse`, `branches`, `employees` keys as aliases reusing the existing `inventory`, `structure`, `users` SVG bodies. Keep the old keys in place (harmless; legacy consumers resolve them — they're just unused after nav update).
- `C:/Users/DELL/Desktop/warehouse/src/config/nav.js` — rewrite `NAV_ITEMS` to:
  1. `{ key: 'dashboard', path: '/dashboard', icon: 'dashboard', roles: ['super_admin'], descriptionKey: 'nav.descriptions.dashboard' }`
  2. `{ key: 'warehouse', path: '/warehouse', icon: 'warehouse', roles: null, descriptionKey: 'nav.descriptions.warehouse' }`
  3. `{ key: 'employees', path: '/employees', icon: 'employees', roles: ['admin', 'super_admin'], descriptionKey: 'nav.descriptions.employees' }`
  4. `{ key: 'branches', path: '/branches', icon: 'branches', roles: ['admin', 'super_admin'], descriptionKey: 'nav.descriptions.branches' }`
  5. `{ key: 'licenses', path: '/licenses', icon: 'licenses', roles: null, descriptionKey: 'nav.descriptions.licenses' }`
  6. `{ key: 'settings', path: '/settings', icon: 'settings', roles: ['super_admin'], descriptionKey: 'nav.descriptions.settings' }`

  Remove the old `inventory`, `transfers`, `structure`, `users` entries. `visibleNavItems(role)` logic is already correct — no change.
- `C:/Users/DELL/Desktop/warehouse/src/components/routing/AppRouter.jsx`:
  - Replace import of `InventoryPage` / `StructurePage` / `UsersPage` / `TransfersPage` with `WarehousePage` / `BranchesPage` / `EmployeesPage` (drop `TransfersPage` import entirely).
  - Replace `<Route path="inventory" …/>` with `<Route path="warehouse" element={<WarehousePage />} />`.
  - Replace `<Route path="structure" … RequireRole roles=['admin','super_admin'] …/>` with `<Route path="branches" element={<RequireRole roles={['admin','super_admin']}><BranchesPage /></RequireRole>} />`.
  - Replace the `<Route path="admin/users" … RequireRole role="super_admin" …/>` with `<Route path="employees" element={<RequireRole roles={['admin','super_admin']}><EmployeesPage /></RequireRole>} />` (role gate widened per approved architecture: admin+).
  - Replace `<Route path="admin/settings" … RequireRole role="super_admin" …/>` with `<Route path="settings" element={<RequireRole role="super_admin"><SettingsPage /></RequireRole>} />`.
  - Delete the `<Route path="transfers" …/>` entry AND its import.
- `C:/Users/DELL/Desktop/warehouse/src/locales/en/common.json`:
  - Under `nav`: delete `inventory`, `transfers`, `structure`, `users`. Add `warehouse: "Warehouse"`, `employees: "Employees"`, `branches: "Branches"`.
  - Under `nav.descriptions`: delete `inventory`, `transfers`, `structure`, `users`. Add the three new entries from the i18n table above.
- `C:/Users/DELL/Desktop/warehouse/src/locales/ru/common.json`: same structure with Russian translations.
- `C:/Users/DELL/Desktop/warehouse/src/locales/hy/common.json`: same structure with Armenian translations.
- `C:/Users/DELL/Desktop/warehouse/src/pages/HomePage/HomePage.test.jsx`: update assertions to the new labels:
  - `super_admin` expects: `Dashboard`, `Warehouse`, `Employees`, `Branches`, `Licenses`, `Settings` (6 tiles, no Transfers / Inventory / Structure / Users).
  - `admin` expects: `Warehouse`, `Employees`, `Branches`, `Licenses`; does NOT expect: `Dashboard`, `Settings`.
  - `user` expects: `Warehouse`, `Licenses`; does NOT expect: `Dashboard`, `Employees`, `Branches`, `Settings`.
  - Update the preamble / describe text if it still says "Inventory".
- `C:/Users/DELL/Desktop/warehouse/src/pages/WarehousePage/WarehousePage.jsx`: body identical to old InventoryPage but:
  - Component exported as `WarehousePage`.
  - `t('nav.warehouse')` and `t('nav.descriptions.warehouse')`.
  - `import './WarehousePage.css';`.
- Same pattern for `BranchesPage` (`nav.branches`) and `EmployeesPage` (`nav.employees`).

**Constraints:**
- Keep the `.placeholder-page` CSS class structure — each new page's CSS file mirrors the old one. No visual change.
- Do NOT leave dead imports.
- Do NOT touch `firestore.rules`, `.env.local`, `package.json`.
- Do NOT install packages.
- Do NOT commit or push.

**Verification:**
```
cd C:/Users/DELL/Desktop/warehouse && CI=true npx react-scripts test --watchAll=false 2>&1 | tail -30
cd C:/Users/DELL/Desktop/warehouse && npm run build 2>&1 | tail -20
```

### Task D — `test-engineer` gate (runs after A, B, C)

Already prescribed in `AGENTS_WAREHOUSE_ORCHESTRATOR.md` §8.5 template. Runs full suite, reports PASS / FAIL with failing names. Dispatched separately after EACH implementer.

## Phase 5 — Reviews

After Task C passes `test-engineer`:
- `spec-reviewer` against this plan file.
- `code-quality-reviewer` on all changed files.
- `security-reviewer` NOT triggered — no auth, rules, storage, or secret surfaces touched in Step 1.

## Phase 6 — Verify (final gate before reporting)

Run both and paste last ~10 lines of each:
```
cd C:/Users/DELL/Desktop/warehouse && CI=true npx react-scripts test --watchAll=false 2>&1 | tail -30
cd C:/Users/DELL/Desktop/warehouse && npm run build 2>&1 | tail -20
```
Expected: tests ≥ 79 (grows by the Drawer test count — about +8). Build: no new warnings.

## Rollback

All changes stay uncommitted. `git restore .` + remove the 3 new page folders + remove `src/components/common/Drawer/` + remove `src/domain/entities/ReturnChecklist.js` + remove `src/domain/repositories/ReturnChecklistRepository.js` returns to baseline. Nothing in `firestore.rules` / `.env.local` / `package.json` changed.

## Out-of-scope (explicitly deferred)

- Real Warehouse / Employees / Branches / Licenses / Settings logic.
- Any Firestore reads or writes for the new typedefs.
- `firestore.rules` updates — deferred to Step 4 or 6 (when real repository ships).
- Fresh custom icons for warehouse / branches / employees (aliased for now).
- Bottom-sheet mobile Drawer variant (MVP ships full-screen modal on mobile).
