# Plan: Row-Action Icons for WarehouseTable

**Status:** ready for execution
**Date:** 2026-04-27
**Author:** warehouse-orchestrator
**Scope:** Feature 1 of 2 (Feature 2 = Asset Kind Taxonomy, separate plan)

## 1. Problem & Goal

The current row actions in `WarehouseTable.jsx` are four full-width text buttons
(`Details`, `Edit`, `Transfer`, `Delete`). The user feedback was blunt:

> "поставь уникальные иконки для Детали Изменить Передать Удалить сорт выглядит очень плохим"

Translation: "Put unique icons on Details/Edit/Transfer/Delete — the row looks
very bad." The user explicitly asked for ERP-grade visual quality
("Сделай красиво и по отдельности, как в профессиональных ERP системах").

**Goal:** replace the four text buttons with four unique, hand-rolled SVG icon
buttons that are visually consistent with the existing icon kit (24×24 outline,
stroke-width 2, `currentColor`), accessible (tooltip + `aria-label` per locale,
keyboard reachable, `:focus-visible` ring), and stylistically distinct so a
glance discriminates them. Destructive (Delete) uses a danger color path.
Primary action (Transfer) keeps a subtle emphasis.

## 2. Out of Scope

- Asset Kind taxonomy / segmented control / migration — all in
  `2026-04-27-asset-kind-taxonomy.md`.
- Licenses page or License-row actions — separate iteration; this plan
  ONLY touches `WarehouseTable`.
- Bulk-row checkboxes / bulk actions toolbar — not requested.
- Replacing nav glyphs in `Icon()` — `dashboard`, `inventory` etc. stay as-is.
- Mobile responsive overflow menu — single horizontal cluster is fine for the
  current breakpoints; revisit when we add a mobile layout pass.

## 3. Files Touched

| Path | Action | Owner role |
|---|---|---|
| `src/components/icons/index.jsx` | extend `paths` with `eye`, `pencil`, `arrowRight`, `trash` | react-ui-engineer |
| `src/components/features/Warehouse/WarehouseTable.jsx` | swap text buttons for icon buttons | react-ui-engineer |
| `src/components/features/Warehouse/WarehouseTable.css` | restyle `.warehouse-table__action` for icon-button form (square pill, no padding asymmetry, color-coded states) | react-ui-engineer |
| `src/components/features/Warehouse/WarehouseTable.test.jsx` | NEW — tests aria-labels, keyboard reach, click forwarding, danger styling absence on non-delete | test-engineer |
| `src/locales/en/warehouse.json` | (re-use existing `actions.*` namespace — already has details/edit/delete/transfer; no new keys needed) | i18n-engineer (no-op verify) |
| `src/locales/ru/warehouse.json` | (re-use existing `actions.*`) | i18n-engineer (no-op verify) |
| `src/locales/hy/warehouse.json` | (re-use existing `actions.*`) | i18n-engineer (no-op verify) |

i18n is a verification-only step here — every required key already exists in
all three languages. The plan calls out this fact instead of dispatching the
i18n-engineer for fresh keys.

## 4. Icon Glyph Specifications

All icons follow the existing kit invariants enforced by `Icon()`:

- 24×24 viewBox, `fill="none"`, `stroke="currentColor"`, stroke-width 2,
  `strokeLinecap="round"`, `strokeLinejoin="round"`.
- Optical alignment: visual centre lands on (12, 12). For icons with a strong
  horizontal mass (arrow), shift the vertical baseline ±0.5px until it reads
  centred at 18px render size.
- Stylistic reference: `licenses` glyph already in the kit has the right
  weight/feel. Match it.

### 4.1 `eye` — Details

```jsx
eye: (
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </>
),
```

Almond outline + central pupil. Standard "view / details" iconography.

### 4.2 `pencil` — Edit

```jsx
pencil: (
  <>
    <path d="M4 20h4l10-10-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </>
),
```

Diagonal pencil-on-paper. Top stroke shows the ferrule line so the shape reads
as a tool, not a generic arrow.

### 4.3 `arrowRight` — Transfer

```jsx
arrowRight: (
  <>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </>
),
```

Single horizontal arrow. Conveys directional motion (storage → recipient).
Resists confusion with the `transfers` nav glyph (which is bidirectional) by
being one-way only — Transfer is a single forward action from the row's POV.

### 4.4 `trash` — Delete

```jsx
trash: (
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>
),
```

Bin with handle + lid + 2 inner ribs. Universal destructive iconography.

### 4.5 Why hand-rolled, not a library

The kit comment in `index.jsx` already states: hand-rolled glyphs avoid pulling
in `lucide-react` / `heroicons` for "a handful of glyphs." Four more glyphs
remains a handful. Adding a dependency for this is overkill and would require
orchestrator-level package approval.

## 5. Button Layout & Visual Design

### 5.1 Button structure (single row, right-aligned)

```
[ eye ] [ pencil ] [ arrowRight ] [ trash ]
  details   edit       transfer     delete
```

- Order: information → mutation → action → destruction. Reading L→R, severity
  rises. This matches Linear, Notion, GitHub.
- Gap between buttons: **6px** (already the `.warehouse-table__actions` gap;
  keep it).
- Each button is a square pill: **32×32**, border-radius **8px**, icon size
  **18px**. The 32px target meets WCAG 2.5.5 minimum (24×24) with comfort.
- Icons inherit `currentColor` from the button text-color rule — variants
  (primary, danger) re-skin the button, not the SVG.

### 5.2 Variants & states

| State | Default | Hover | Focus-visible | Active | Disabled |
|---|---|---|---|---|---|
| neutral (eye, pencil) | bg `var(--color-surface,#fff)`, border `var(--color-border,#d1d5db)`, color `var(--color-text-secondary,#4b5563)` | bg `var(--color-surface-hover,#f3f4f6)`, color `var(--color-text-primary,#111827)`, border same | outline 2px `var(--color-focus,#2563eb)`, outline-offset 1px | bg slightly darker `#e5e7eb` | opacity 0.45, cursor `not-allowed` |
| primary (arrowRight) | bg `var(--color-primary,#2563eb)`, border same, color `#fff` | bg `var(--color-primary-hover,#1d4ed8)` | outline as above | bg `#1e40af` | opacity 0.45, cursor `not-allowed` |
| danger (trash) | bg `var(--color-surface,#fff)`, border `var(--color-border,#d1d5db)`, color `var(--color-danger,#dc2626)` | bg `var(--color-danger-soft,#fef2f2)`, border `var(--color-danger,#dc2626)`, color `var(--color-danger,#dc2626)` | outline `var(--color-danger,#dc2626)` 2px, offset 1px (red ring on red action — reads as confirmation it's the dangerous one) | bg `#fee2e2` | opacity 0.45, cursor `not-allowed` |

Transition: `background-color 120ms, border-color 120ms, color 120ms,
box-shadow 120ms`. Already mostly in place — preserve the tokens, replace the
geometry.

### 5.3 Hover lift

To avoid a flat ERP feel, neutral buttons get a `box-shadow: 0 1px 2px
rgba(15,23,42,0.08)` baseline; on hover, `box-shadow: 0 2px 4px
rgba(15,23,42,0.12)`. Primary keeps a single soft shadow at all times. Danger
gains the soft shadow only on hover (signals the action becomes "live"). This
adds depth without the cartoon-y effect of larger lifts.

### 5.4 Vertical alignment in row

Icon buttons sit on the trailing `td.warehouse-table__actions-cell`, vertically
centred. The `td` already uses `text-align: right`; combined with
`display: inline-flex` on the inner `.warehouse-table__actions`, the cluster
right-aligns and centres in the row. No change needed.

### 5.5 Density

Row height is determined by the `<Tr>` line-height + cell padding. With
32×32 buttons and 8px vertical cell padding, rows are ≥ 48px tall — comfortable
without becoming spreadsheet-like.

### 5.6 Tooltip

Native `title` attribute is sufficient and matches every existing button in the
codebase. No custom tooltip component (would add scope and a portal). Tooltip
text = `aria-label` text = `t('actions.<key>')`. This means screen-readers and
sighted hover users see the same label, and translations exist already.

## 6. Accessibility

- `aria-label` per button — required because the button has no visible text.
  Sourced from `actionLabels.<key>` (already wired).
- `title` for sighted hover; same string.
- Keyboard: native `<button>` retains Tab focus. `:focus-visible` ring is
  spec'd above per variant.
- Screen-reader test: each button is announced as "Details, button" (etc.) in
  English, "Մանրամասներ, կոճակ" in Armenian, "Детали, кнопка" in Russian.
- Disabled state: when `onDelete`/`onEdit`/`onTransfer` callback is `undefined`
  (non-staff), the button is NOT rendered (current behaviour kept). We do not
  render-then-disable — that would clutter the row for viewers.
- Icon `<svg>` inside a labelled button is `aria-hidden` (default in `Icon()`
  when no `aria-label` is passed). The button label is the source of truth.

## 7. Implementation Tasks (sequential, in order)

### Task 1 — react-ui-engineer: extend icon kit

Add 4 entries to `paths` in `src/components/icons/index.jsx` per §4. Don't
re-order existing entries. No alias overrides.

Acceptance:
- `import { Icon } from '../icons';` then `<Icon name="eye" />` (and pencil,
  arrowRight, trash) renders without console errors.
- `npm run build` succeeds.
- No regression in nav (ensure `inventory`, `structure`, `users` aliases still
  resolve).

### Task 2 — react-ui-engineer: rewrite WarehouseTable button block + CSS

In `WarehouseTable.jsx`:
- Replace each button's child text with `<Icon name="<glyph>" size={18} />`.
- Keep `aria-label` and `title` set from `labels`.
- Add `className="warehouse-table__action warehouse-table__action--icon"` for
  the new geometry.
- Keep `--primary` on Transfer, `--danger` on Delete; add the new
  `--icon` modifier so the geometry rules don't bleed to other usages of
  `.warehouse-table__action`.

In `WarehouseTable.css`:
- Add `.warehouse-table__action--icon` rule: width 32, height 32, padding 0,
  display `inline-flex`, align/justify `center`, border-radius 8.
- Update existing `.warehouse-table__action` to retain the **font-size based**
  styling for any non-icon usages (currently none, but defensive).
- Add the box-shadow rules per §5.3.
- Add the danger focus-visible override per §5.2.

Acceptance:
- Visual parity with the §5 spec.
- `npm run build` succeeds.

### Task 3 — test-engineer: WarehouseTable.test.jsx

Co-locate at `src/components/features/Warehouse/WarehouseTable.test.jsx`.

Test cases:
1. Renders four action buttons when all four callbacks are provided, each with
   correct `aria-label` from `actionLabels`.
2. Hides Edit/Delete/Transfer buttons when the corresponding callback is
   `undefined` (viewer scenario), keeps Details.
3. Clicking each button calls the matching callback with the row's asset
   object.
4. Each button renders an inline `<svg>` (verifies icon presence, not pixel
   geometry).
5. The Delete button has the `--danger` modifier; Transfer has `--primary`;
   Details and Edit have neither.
6. Keyboard reach: pressing Tab from a previous focusable element lands on
   Details, then Edit, then Transfer, then Delete in order.
7. `aria-sort` on the actions column header remains undefined / not-set
   (regression guard for the header `aria-label` that was already there).

Run `npm test -- --watchAll=false`. Paste last 30 lines.

### Task 4 — i18n-engineer: VERIFY existing keys

No new keys. Verification only:
- Confirm `actions.details`, `actions.edit`, `actions.transfer`,
  `actions.delete` exist in `en`, `ru`, `hy` `warehouse.json`.
- Run `npm run build` to make sure i18n bundling didn't break.

If a key is somehow missing on any language, ADD the missing translation
(English fallback as the source). Currently all three languages are confirmed
present (verified by orchestrator before plan write).

### Task 5 — verification (orchestrator gate)

```bash
cd C:/Users/DELL/Desktop/warehouse
npm test -- --watchAll=false
npm run build
```

Both must pass with no new warnings. Paste last 10 lines of each.

## 8. Review Checklist

### 8.1 spec-reviewer

- All four glyphs added to `paths`, no others.
- WarehouseTable.jsx text removed; Icon component used; aria-labels and titles
  preserved.
- CSS variant modifiers preserved on the right buttons.
- Tests cover keyboard order + variant classes + click forwarding.
- No new dependencies. No nav-glyph changes.

### 8.2 code-quality-reviewer

- No firebase / firestore / hooks imports introduced into `WarehouseTable.jsx`
  (still pure presentational).
- `Icon()` invariants honoured (no inline `stroke="black"`, no inline
  `fill="..."`).
- CSS uses existing tokens; no new hex colors that aren't a derivation of an
  existing token (the `#1e40af` active state is the documented exception —
  call it out as `var(--color-primary-active, #1e40af)` if a token exists, or
  inline with a comment if not).
- No hard-coded English in the JSX.
- `:focus-visible` is used, not `:focus`, to avoid mouse-click rings.

### 8.3 security-reviewer

NOT triggered. This change does not touch:
- Auth / role logic
- Firestore rules / Storage rules
- `.env.*` / secrets
- Repository layer

If during execution any of those gain a touch (e.g. role-gating moves from the
page to the table), re-evaluate.

## 9. Test Strategy Recap

| Layer | Tool | Scope |
|---|---|---|
| Component | `@testing-library/react` + `user-event` | aria-labels, click forwarding, variant classes, keyboard tab order |
| Visual / pixel | manual via `npm start` | check at default zoom that the cluster is right-aligned, hover/focus rings render, danger ring is red |
| i18n | verify all 3 locale files keyed | covered by Task 4 |
| Build | `npm run build` | no new warnings |

No emulator / Firestore tests needed — repository layer is untouched.

## 10. Rollback

Git-only revert. No data migration to undo. If Task 2 breaks production,
reverting `WarehouseTable.jsx` + `WarehouseTable.css` restores the previous
text-button row. Icon paths added in Task 1 are dead code without callers and
are safe to keep or revert.

## 11. Manual Verification Steps (for Phase 7 deliver)

1. `npm start`, log in as super_admin, navigate to `/warehouse`.
2. Confirm each row shows four square icon buttons aligned to the right.
3. Hover each: tooltip reads "Details" / "Edit" / "Transfer" / "Delete" in EN
   (or the equivalent in the current locale).
4. Tab through the row: focus ring is visible on each button; on Delete the
   ring is red.
5. Click Details — drawer opens. Edit — edit drawer opens. Transfer —
   transfer drawer opens. Delete — confirmation modal opens.
6. Switch locale to RU, then HY. Tooltips and aria-labels reflect the change.
7. Log out and log back in as a non-staff user (viewer): confirm only Details
   button is shown.

## 12. Definition of Done

- All five tasks PASS test-engineer and reviewer cycles.
- `npm run build` succeeds with no new warnings.
- Manual verification (§11) ticked off in the deliver report.
- The user-facing row reads as a professional ERP — clean glyphs, correct
  spacing, distinct severity per action.
- NO commit / NO push (standing user rule).
