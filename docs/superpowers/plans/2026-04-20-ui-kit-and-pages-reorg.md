# UI Kit + Pages Reorg (Iteration 1.5)

**Status:** active
**Owner:** warehouse-orchestrator
**Date:** 2026-04-20
**Branch:** feature/iteration-1-core-ui

## Intent (one line)

Build a reusable UI kit in `src/components/common/`, scale up the visual density, replace raw HTML tags across existing pages with kit components, and reorganize `src/pages/` so each page lives in its own folder.

## Non-goals

- New npm packages (no Radix, no headlessui, no Tailwind activation).
- Rewriting the design palette — colors stay, we only grow sizes.
- New product features (no /inventory data logic).
- Migrating `RoleGate.jsx` away — see §Gotchas.
- Any git operations. Everything is left in the working tree; the user commits.

## Scope expansion (2026-04-20 second pass)

User confirmed variant (3) — "continue, fill the rest of common with what we might need". Kit scope widens to include:

- Modal/Dialog (ESC + outside-click close, backdrop, focus trap-lite)
- Table (Thead/Tbody/Tr/Th/Td, sticky header, hover)
- Tabs (controlled + uncontrolled)
- Toast (context provider, variants, auto-dismiss)
- Tooltip (hover/focus)
- Spinner
- Switch + Checkbox
- Divider
- Menu (dropdown)
- Stack + Cluster (layout primitives)

Pages reorg is also enlarged: each placeholder becomes its own folder/page.

NO git commits performed. All work sits in working tree for the user to review and commit.

## Success criteria

1. Every new `src/components/common/*` component is a real folder (`Component.jsx` + `Component.css` + `index.js` + targeted tests for behavior-carrying ones).
2. No existing page or component renders a raw `<button>`, raw form `<input>`, or inline-styled card wrapper. All go through kit components.
3. Base font size grows to 15px; H1 grows to 28px; primary button height 40px; card radius 12px. UI feels larger without feeling touch-oriented.
4. Every page lives in `src/pages/<PageName>/`.
5. `placeholders.jsx` is gone — every placeholder is its own page folder.
6. `npm test -- --watchAll=false` passes (target: ≥ 48 tests, same or more).
7. `npm run build` succeeds with no new warnings.
8. Browser smoke: `/login → / → tile click → /dashboard → /profile` works on all three languages.

## Gotchas / Decisions fixed up front

- **`RoleGate` vs `RequireRole` — BOTH KEPT.** These are not duplicates. `RequireRole` is a routing guard that redirects to `/forbidden`. `RoleGate` is a non-routing visibility gate that silently hides children. Different semantics, different use-sites. Keep both. Add a header comment to each clarifying the difference to future readers.
- **`<Select>` for TopBar language picker.** Keep the visual "globe icon + select inside a pill" composition; the kit's `<Select>` must support an `iconLeft` prop so TopBar can pass `<Icon name="globe" />`.
- **`<Card>` subcomponents.** Use a simple `<Card>` + separate `<PageHeader>` — no `Card.Header/Body/Footer` compound. The Dashboard grid items already use hand-rolled "header + body" patterns that are diverse enough that forcing a compound Card would be awkward.
- **Layout primitives (`<Stack>` / `<Cluster>`).** Skip for this iteration. The existing CSS already composes well with flex/grid via co-located CSS files; adding layout primitives now would force refactoring every co-located CSS file, which balloons scope.
- **Design tokens home.** Create `src/styles/tokens.css` imported once from `src/index.css`. All kit components and existing co-located CSS read from CSS custom properties (`var(--color-...)`, `var(--space-...)`, `var(--radius-...)`, `var(--font-...)`). No tokens-as-JS-module, no theme provider.
- **Form input under `kit/Input`.** The existing `src/components/common/Input/` folder is empty — use it. Pair with a `<FormField>` wrapper that renders `label + input + error + helper` as a unit. `Input` itself remains dumb.
- **`EmptyState` replaces `RoutePlaceholder` visually, but `RoutePlaceholder` stays as a thin wrapper** so we don't have to chase every import today. Future work: inline `<EmptyState>` at every placeholder call site, then delete `RoutePlaceholder`.
- **Avatar:** initials-only for now. No image upload flow yet — the schema has `photoURL` but it's unused. Avatar supports a `src` prop for when that lands.
- **Tests for kit components:** Button (variants + disabled + loading), Input (label + error association via `aria-describedby`), Badge (tone renders class), Select (onChange fires), Card (renders children), PageHeader (title + actions slot). Other components (Avatar, Icon wrapper, EmptyState) — covered transitively via page tests, no dedicated test file yet.

## Phase breakdown (sequential commits)

Each phase is one commit. test-engineer runs after every phase; no phase advances until tests pass.

### Phase A — Tokens + UI Kit

**Role:** react-ui-engineer
**Commit:** `feat(ui): design tokens + common UI kit (Button, Input, Card, Badge, Select, Avatar, Icon wrapper, PageHeader, EmptyState)`

**Files to create (absolute paths, all under `C:/Users/DELL/Desktop/warehouse/`):**

```
src/styles/tokens.css                           -- CSS custom properties
src/components/common/Button/Button.jsx
src/components/common/Button/Button.css
src/components/common/Button/Button.test.jsx
src/components/common/Button/index.js
src/components/common/Input/Input.jsx
src/components/common/Input/Input.css
src/components/common/Input/Input.test.jsx
src/components/common/Input/index.js
src/components/common/Input/FormField.jsx         -- composition helper (label + input + error/helper)
src/components/common/Input/FormField.css
src/components/common/Card/Card.jsx
src/components/common/Card/Card.css
src/components/common/Card/Card.test.jsx
src/components/common/Card/index.js
src/components/common/Badge/Badge.jsx
src/components/common/Badge/Badge.css
src/components/common/Badge/Badge.test.jsx
src/components/common/Badge/index.js
src/components/common/Select/Select.jsx
src/components/common/Select/Select.css
src/components/common/Select/Select.test.jsx
src/components/common/Select/index.js
src/components/common/Avatar/Avatar.jsx
src/components/common/Avatar/Avatar.css
src/components/common/Avatar/index.js
src/components/common/Icon/Icon.jsx               -- thin wrapper over existing components/icons
src/components/common/Icon/Icon.css
src/components/common/Icon/index.js
src/components/common/PageHeader/PageHeader.jsx
src/components/common/PageHeader/PageHeader.css
src/components/common/PageHeader/PageHeader.test.jsx
src/components/common/PageHeader/index.js
src/components/common/EmptyState/EmptyState.jsx
src/components/common/EmptyState/EmptyState.css
src/components/common/EmptyState/index.js
src/components/common/index.js                    -- barrel re-exports
```

**Files to modify:**

- `src/index.css` — import tokens.css and set base body font size/line-height to the new tokens.

**Design token values (target):**

```
--font-family-base: system-ui stack (keep current)
--font-size-xs: 12px
--font-size-sm: 13px
--font-size-md: 15px   /* body base, was 14 */
--font-size-lg: 17px
--font-size-xl: 20px
--font-size-2xl: 24px
--font-size-3xl: 28px  /* h1, was 22-24 */

--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-7: 32px
--space-8: 40px

--radius-sm: 6px
--radius-md: 10px
--radius-lg: 12px
--radius-pill: 999px

--color-bg-app: #f8fafc
--color-bg-surface: #ffffff
--color-bg-subtle: #f1f5f9
--color-border: #e5e7eb
--color-border-strong: #cbd5e1
--color-text-primary: #0f172a
--color-text-secondary: #475569
--color-text-muted: #64748b
--color-primary: #1d4ed8
--color-primary-hover: #1e40af
--color-primary-soft: #eff6ff
--color-danger: #b91c1c
--color-danger-soft: #fef2f2
--color-success: #047857
--color-success-soft: #ecfdf5
--color-warning: #b45309
--color-warning-soft: #fef3c7
--color-info: #0369a1
--color-info-soft: #e0f2fe

--shadow-sm: 0 1px 2px rgba(15,23,42,0.06)
--shadow-md: 0 6px 18px -10px rgba(15,23,42,0.2)

--control-height-sm: 32px
--control-height-md: 40px
--control-height-lg: 48px
```

**Component API summary:**

- `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" loading disabled iconLeft iconRight fullWidth type>`
- `<Input type size="sm|md|lg" invalid prefix suffix>` — forwardRef; `aria-invalid` when `invalid`.
- `<FormField label htmlFor error helper required>` children — sets `aria-describedby` on input via cloneElement.
- `<Card as="div|section|article" padding="sm|md|lg" tone="default|muted">`.
- `<Badge tone="neutral|success|warning|danger|info|primary" size="sm|md">` children.
- `<Select size iconLeft invalid>` — native `<select>` under the hood; forwardRef; children = `<option>`.
- `<Avatar name src size="sm|md|lg">` — if `src` renders `<img>`, else initials from `name`.
- `<Icon name size="sm|md|lg">` — maps to pixel sizes 16/20/24; thin wrapper around `components/icons`.
- `<PageHeader title subtitle actions>` — actions is a React node slot on the right.
- `<EmptyState icon title description action>` — action is a node (commonly a Button or Link).

**Tests (minimum):**

- Button: primary renders, disabled disables, loading shows spinner & sets `aria-busy`, variant class applied.
- Input: invalid sets `aria-invalid`; prefix/suffix render.
- FormField: error message linked via `aria-describedby`.
- Badge: each tone class applied.
- Card: renders children; `as` prop works.
- PageHeader: title, subtitle, actions all rendered.
- Select: change event propagates.

**Verification:** `npm test -- --watchAll=false && npm run build`.

### Phase B — Refactor existing components/pages to use the kit

**Role:** react-ui-engineer
**Commit:** `refactor(ui): adopt common kit across existing components and pages`

**Files to modify:**

- `src/components/auth/LoginForm.jsx` + `.css` — use `<FormField>`, `<Input>`, `<Button>` (loading state replaces manual "Вход…" swap).
- `src/components/layout/Sidebar.jsx` / `.css` — brand mark stays, nav links remain `<NavLink>` (Button is wrong semantic for routing links, but restyle the link to match kit spacing via tokens).
- `src/components/layout/TopBar.jsx` / `.css` — language `<select>` → `<Select iconLeft=<Icon name="globe" />>`. Profile pill — custom button (keep, because of the chevron + avatar composition; convert class to consume tokens). Menu `<button>` items → `<Button variant="ghost">`. Role mini-label → `<Badge tone="neutral" size="sm">`.
- `src/components/features/Dashboard/StatCard.jsx` + `.css` — wrap in `<Card padding="md">`; keep internal layout.
- `src/components/features/Dashboard/RecentActivity.jsx` + `.css` — `<Card>` wrapper; state dots stay.
- `src/components/features/Dashboard/BranchesOverview.jsx` + `.css` — `<Card>` wrapper.
- `src/pages/HomePage.jsx` + `.css` — add `<PageHeader title=welcome subtitle>`; tiles remain `<Link>` but adopt tokens via class; convert tile rendering to use `<Card>` underneath.
- `src/pages/DashboardPage.jsx` + `.css` — `<PageHeader>` at top.
- `src/pages/ProfilePage.jsx` + `.css` — `<Card>` wrapper; `role` row value → `<Badge>`.
- `src/pages/LoginPage.jsx` + `.css` — keep; spacing updated via tokens; notice → `<Card tone="warning">` or inline styled banner (keep inline banner, but consume tokens).
- `src/pages/ForbiddenPage.jsx` — remove inline styles, render `<EmptyState title description action=<Link>>`; keep file location (moves in Phase C).
- `src/pages/NotFoundPage.jsx` — same as Forbidden.
- `src/pages/placeholders.jsx` — unchanged here; will be deleted in Phase C.
- `src/components/common/RoutePlaceholder/RoutePlaceholder.jsx` — reimplement using `<EmptyState>`. Keep the wrapper function exported; keep the "Coming soon" badge.

**Keep:** existing NavLink routing (do not convert to Button). Keep all i18n keys untouched.

**Verification:** `npm test -- --watchAll=false && npm run build`. Spot-check in browser on dev server.

### Phase C — Reorganize src/pages/

**Role:** react-ui-engineer
**Commit:** `refactor(pages): one folder per page; split placeholders into standalone pages`

**Moves / new folders (all absolute paths under `C:/Users/DELL/Desktop/warehouse/src/pages/`):**

```
HomePage/
  HomePage.jsx      <- from src/pages/HomePage.jsx
  HomePage.css      <- from src/pages/HomePage.css
  HomePage.test.jsx <- from src/pages/HomePage.test.jsx (import paths fixed)
  index.js          -> re-export
DashboardPage/
  DashboardPage.jsx
  DashboardPage.css
  index.js
ProfilePage/
  ProfilePage.jsx
  ProfilePage.css
  index.js
LoginPage/
  LoginPage.jsx
  LoginPage.css
  index.js
ForbiddenPage/
  ForbiddenPage.jsx
  ForbiddenPage.css     (new, replaces inline styles from Phase B)
  index.js
NotFoundPage/
  NotFoundPage.jsx
  NotFoundPage.css
  index.js

-- split from placeholders.jsx --
InventoryPage/InventoryPage.jsx  (renders <EmptyState> via <PageHeader> + description)
TransfersPage/TransfersPage.jsx
StructurePage/StructurePage.jsx
LicensesPage/LicensesPage.jsx
UsersPage/UsersPage.jsx            (component name UsersAdminPage retained inside file
                                    and re-exported as UsersPage for AppRouter clarity;
                                    the router import name updates to `UsersPage`)
SettingsPage/SettingsPage.jsx      (same: was SettingsAdminPage)
```

Delete:

```
src/pages/HomePage.jsx, HomePage.css, HomePage.test.jsx
src/pages/DashboardPage.jsx, .css
src/pages/ProfilePage.jsx, .css
src/pages/LoginPage.jsx, .css
src/pages/ForbiddenPage.jsx
src/pages/NotFoundPage.jsx
src/pages/placeholders.jsx
```

Update imports:

- `src/components/routing/AppRouter.jsx` — replace the `pages/placeholders` multi-import with per-page imports; rename `UsersAdminPage` → `UsersPage`, `SettingsAdminPage` → `SettingsPage` in routes.
- `src/pages/HomePage/HomePage.test.jsx` — fix the two relative-import paths (`../hooks/useAuth` → `../../hooks/useAuth`, `../contexts/AuthContext` → `../../contexts/AuthContext`, `../i18n` → `../../i18n`, `./HomePage` stays). Jest mocks `../infra/...` become `../../infra/...`.

Add comments to clarify NON-duplicate routing components:

- Top of `src/components/routing/RoleGate.jsx` — note it is the visibility-only sibling of `RequireRole`.
- Top of `src/components/routing/RequireRole.jsx` — note it is the routing-redirect sibling of `RoleGate`.

**Verification:** `npm test -- --watchAll=false && npm run build`.

### Phase D — Final verification & manual browser smoke

- `npm test -- --watchAll=false` full run, paste last 15 lines.
- `npm run build` full run, paste last 10 lines.
- Developer runs `npm start` and verifies: login → home → tile click → dashboard → profile → language switch. Orchestrator requests user confirmation only if something looks off; otherwise ship.

## Rollback

Every phase is one commit. Any single `git revert <sha>` restores the previous working tree. Tests on the restored state must still pass — the preceding commit was already green.

## Out-of-scope TODOs (next iteration)

- `Modal/Dialog` for "Передать актив" flow.
- `Table/` kit component (needed when Inventory and Users pages get real data).
- `Tabs/` for Transfers page (incoming / outgoing / recent).
- `Toast/Notification` for error + success feedback.
- `Stack/` / `Cluster/` layout primitives — revisit once the kit is in use and we see how much CSS remains truly custom.
- Inline `<EmptyState>` at call sites, delete `RoutePlaceholder` wrapper.
