# Plan: Design System Upgrade (Notion / Linear / Stripe-grade visual layer)

**Status:** ready for execution
**Date:** 2026-04-27
**Author:** warehouse-orchestrator
**Scope:** Kit-level visual / typographic upgrade. Ships BEFORE the Feature 2
asset-kind taxonomy (`2026-04-27-asset-kind-taxonomy.md`) so that Feature 2
inherits the new look from the start.
**Sequencing:** This plan is task **0** of the combined design-system + Feature
2 effort. The kind-taxonomy plan now declares this plan as a dependency.

## 1. Problem

User's verdict on the current UI: "выглядит слишком просто и 'дешево'". Wants
the bar lifted to **Notion / Linear / Stripe** density and polish. Concrete
gaps:

1. Modals / drawers feel cramped — padding too tight, headings too small,
   no visual grouping between field clusters.
2. Inputs are short (32–40px), the focus ring has no soft outer glow, and
   there is no inline-icon affordance that reads as "modern SaaS form".
3. Default font stack is the OS-native system stack — fine, but not the
   geometric humanist look the user wants. Inter is the reference.
4. Body text is `#0f172a` already (slate-900), but secondary copy is muted
   too aggressively in some places and not enough in others. We need a clean
   2-tier hierarchy: primary slate-900, secondary slate-500.
5. Tables breathe poorly: rows are ~36px with `--space-3` padding. Cramped
   for a real ERP.
6. Row-action button shadows (just shipped) are visually heavy. User wants
   "barely-there glass."

## 2. Goal

Promote the existing `tokens.css` + base kit (22 components in
`src/components/common/*`) to a **Linear / Stripe / Notion-grade** ERP
aesthetic. The change is **token-first, kit-second**: a future palette /
density tweak is still a one-file edit. Every page in the app inherits the
upgrade automatically; no page-level CSS rewrites required for the basic
look.

The user's own benchmark: "Нам нужен чистый, профессиональный ERP-вид."

## 3. Out of Scope

- **Dark mode.** Tokens stay :root-scoped; we don't add `[data-theme="dark"]`
  in this iteration. The token names (`--color-text-primary`, etc.) are
  already abstract enough that a future dark mode is a separate plan.
- **Tailwind activation.** Plain CSS + tokens stays the styling strategy.
- **Component API changes.** Existing props on Input / Button / Modal /
  Drawer / Table / Card stay backwards-compatible. Visual change only,
  except `Input` gains an optional `leadingIcon` slot (additive prop).
- **Animations beyond what already ships.** Existing fade/slide-in keyframes
  are kept. We don't add motion-design flourishes here.
- **Custom illustrations / iconography overhaul.** The existing `<Icon>`
  glyph set is fine; the recent row-action additions stay.
- **Accessibility re-audit.** We preserve existing a11y characteristics
  (focus-visible rings, contrast). New focus ring stays WCAG-AA on white.

## 4. Decisions (orchestrator-resolved — no user clarification)

Per the standing "do not stack questions" feedback rule, all micro-choices
are decided here.

### 4.1 Font stack

- **Primary:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`.
- **Mono:** unchanged.
- **Hosting:** self-host via `@fontsource/inter`. Pull only the weights the
  app actually uses to keep the bundle lean: **400 / 500 / 600 / 700**.
- Do NOT pull from Google Fonts CDN — keeps the offline / strict-CSP posture
  consistent with Firebase Hosting later, and avoids a third-party network
  dep in tests.
- Imports go in `src/index.js`, ONCE, before `./index.css`. Tree-shaking
  ensures unused weights/styles drop out.

### 4.2 Color palette upgrade (slate-based, Linear/Stripe-style)

The existing `--color-*` token names stay; only the values change. This is
intentional — every kit component already references the names.

| Token | Old | New | Notes |
|---|---|---|---|
| `--color-bg-app`         | `#f8fafc` | `#f8fafc`   | unchanged (slate-50) |
| `--color-bg-surface`     | `#ffffff` | `#ffffff`   | unchanged |
| `--color-bg-subtle`      | `#f1f5f9` | `#f1f5f9`   | unchanged (slate-100) |
| `--color-bg-muted`       | (NEW)     | `#f8fafc`   | NEW — group panel fill (slate-50) |
| `--color-border`         | `#e5e7eb` | `#e2e8f0`   | shift to slate-200 for tonal coherence |
| `--color-border-strong`  | `#cbd5e1` | `#cbd5e1`   | unchanged (slate-300) |
| `--color-text-primary`   | `#0f172a` | `#0f172a`   | unchanged (slate-900) |
| `--color-text-secondary` | `#475569` | `#475569`   | unchanged (slate-600) |
| `--color-text-muted`     | `#64748b` | `#64748b`   | unchanged (slate-500) |
| `--color-text-subtle`    | (NEW)     | `#94a3b8`   | NEW — placeholder / leading-icon (slate-400) |
| `--color-primary`        | `#1d4ed8` | `#2563eb`   | shift to blue-600 for slightly brighter accent |
| `--color-primary-hover`  | `#1e40af` | `#1d4ed8`   | shift to blue-700 |
| `--color-primary-soft`   | `#eff6ff` | `#eff6ff`   | unchanged (blue-50) |
| `--color-primary-ring`   | (NEW)     | `#dbeafe`   | NEW — outer glow on focus (blue-100) |
| All danger / success / warning / info tones | unchanged | unchanged | leave alone — out of scope |

Reasoning: minimal palette movement to keep the existing toast / badge / chip
colors coherent. The visible shifts are: a touch brighter primary (Linear
uses blue-600), a slightly cooler border, and two NEW tokens for the modal
group-panel fill and the focus glow halo.

### 4.3 Typography scale upgrade

| Token | Old | New | Notes |
|---|---|---|---|
| `--font-size-xs`  | 12px  | 12px  | unchanged |
| `--font-size-sm`  | 13px  | 13px  | unchanged |
| `--font-size-md`  | 15px  | 14px  | tighten body to Linear's 14px |
| `--font-size-lg`  | 17px  | 16px  | |
| `--font-size-xl`  | 20px  | 18px  | section heading inside drawers/modals |
| `--font-size-2xl` | 24px  | 22px  | drawer/modal title |
| `--font-size-3xl` | 28px  | 28px  | unchanged (h1 / page hero) |

Letter-spacing for Inter at body sizes is naturally tighter than the OS
fallbacks; no `letter-spacing` token needed yet. Add `font-feature-settings:
'cv11', 'ss01', 'ss03'` on the `body` rule in `index.css` for Inter's
tabular numerals, alternate `a`, and curved `l` — these are the Linear/Stripe
defaults.

### 4.4 Spacing & control sizing

| Token | Old | New | Notes |
|---|---|---|---|
| `--control-height-sm` | 32px | 32px | unchanged |
| `--control-height-md` | 40px | 40px | unchanged — already at the target |
| `--control-height-lg` | 48px | 48px | unchanged |

No new spacing tokens — the existing scale (`--space-1`..`--space-8`,
4..40px) covers every measurement needed below. Skip adding 48 / 64 px
tokens until a real consumer needs them.

Spacing semantics inside modals / drawers (NEW intent, not new tokens):

- **Drawer body padding:** was `var(--space-5)` (20px) → now `var(--space-7)`
  (32px) horizontal, `var(--space-6)` (24px) vertical.
- **Modal body padding:** same as drawer (32px / 24px).
- **Drawer / modal header padding:** `var(--space-6) var(--space-7)`
  (24px / 32px).
- **Spacing between field groups:** `var(--space-6)` (24px).
- **Spacing between fields inside a group:** `var(--space-4)` (16px).

### 4.5 Radius & shadow

| Token | Old | New | Notes |
|---|---|---|---|
| `--radius-sm` | 6px  | 6px  | unchanged — small chips / badges |
| `--radius-md` | 10px | 8px  | inputs / buttons → 8px (Linear standard) |
| `--radius-lg` | 12px | 12px | modals / drawers / cards |
| `--radius-pill` | 999px | 999px | unchanged |

Shadows — re-tuned so default surfaces sit lighter and float (less drop-shadow
chroma):

| Token | Old | New |
|---|---|---|
| `--shadow-sm`        | `0 1px 2px rgba(15,23,42,.06)`  | `0 1px 2px rgba(15,23,42,.04)` |
| `--shadow-md`        | `0 6px 18px -10px rgba(15,23,42,.2)` | `0 4px 12px -6px rgba(15,23,42,.08), 0 2px 4px -2px rgba(15,23,42,.06)` |
| `--shadow-lg`        | `0 10px 25px -5px rgba(15,23,42,.15)` | `0 24px 48px -16px rgba(15,23,42,.12), 0 8px 16px -8px rgba(15,23,42,.08)` |
| `--shadow-glass` (NEW) | — | `0 1px 2px rgba(15,23,42,.04)` (rest) |
| `--shadow-glass-hover` (NEW) | — | `0 2px 8px rgba(15,23,42,.06)` (hover) |

The two NEW glass shadows feed the row-action buttons (replace the per-variant
heavy shadows shipped in Feature 1). Existing variant tinted shadows on those
buttons are removed in favor of the universal glass pair.

### 4.6 Focus ring upgrade

```css
--focus-ring: 0 0 0 3px var(--color-primary-ring);
```

(was `0 0 0 3px rgba(59,130,246,0.35)`). The named token reads cleaner and
matches the rest of the palette.

For inputs we add a layered focus ring: 1px primary border + 3px outer glow.
Existing `.input:focus-within { border-color: --color-primary; box-shadow:
--focus-ring; }` already produces this; only the values change.

For row-action buttons, the danger focus ring stays red (already shipped in
Feature 1 — keep it). Update its value to use the new ring approach:
`0 0 0 3px rgba(185,28,28,.18)`.

### 4.7 Inputs

- Default height stays 40px (`--control-height-md`).
- Border 1px `--color-border` (slate-200), radius `--radius-md` = 8px.
- Padding becomes `0 var(--space-4)` (16px) for `md`. Increase from current
  12px so leading icons have room and text doesn't kiss the border.
- **Leading-icon support (NEW):** the existing `prefix` slot on `<Input>` is
  fine for arbitrary nodes. We add a sibling component-shorthand prop
  `leadingIcon: string` (icon name in the existing Icon set). When set, the
  component renders `<Icon name={leadingIcon} size={16} />` inside the prefix
  slot with `color: var(--color-text-subtle)` and a 12px gap.
- Date inputs (`type="date"`) auto-receive `leadingIcon="calendar"` if no
  prefix/leadingIcon is otherwise provided. The Icon set ships a `calendar`
  glyph (already exists or is added in this plan, see §6).
- Disabled state: background `var(--color-bg-subtle)`, text muted, border
  unchanged.

### 4.8 Modals & drawers — section grouping

Two NEW kit subcomponents are added to give the drawer / modal body a
deliberately grouped visual structure:

- `<FieldGroup title?>` — wraps a related set of fields. Optional title
  rendered as a small uppercase tracking label. The whole group sits on a
  `--color-bg-muted` (slate-50) panel with 12px radius and `var(--space-5)`
  padding. Groups stack with `var(--space-6)` between them.
- `<FieldGroup.Row>` — a horizontal pair container (gap = `var(--space-4)`).

Both live in `src/components/common/FieldGroup/`. They are pure layout — no
state, no validation. Plan 2 (Quick-Add Drawer) will consume these to wrap
"Identity" (kind / name / type), "Pricing & code", and "Condition & warranty"
clusters on the upgraded look.

### 4.9 Tables — breathing room

| Aspect | Old | New |
|---|---|---|
| Default cell padding | `var(--space-3) var(--space-4)` (12 / 16) | `var(--space-4) var(--space-5)` (16 / 20) |
| Row height implied | ~44px | ~56–60px |
| Hover fill | `var(--color-bg-subtle)` | `var(--color-bg-muted)` (slate-50, lighter) |
| Header bg | `var(--color-bg-subtle)` | `var(--color-bg-muted)` (lighter, less heavy) |
| Header divider | `1px solid --color-border` | `1px solid --color-border` (kept) |
| Row divider | `1px solid --color-bg-subtle` | `1px solid --color-border` (slightly more visible) |
| Dense modifier | unchanged | unchanged — opt-in for legacy callers |

The dense mode (`.table--dense`) keeps the OLD spacing values so any caller
that explicitly picks dense still gets a tight table. We do not auto-switch
existing pages to dense — they all render in the new comfortable mode.

### 4.10 Row-action buttons (WarehouseTable.css)

The recently-shipped per-variant heavy shadows go. Replace with:

```css
.row-action-btn {
  box-shadow: var(--shadow-glass);
  transition: box-shadow var(--transition-fast),
              background var(--transition-fast),
              color var(--transition-fast);
}
.row-action-btn:hover {
  box-shadow: var(--shadow-glass-hover);
}
.row-action-btn--danger:focus-visible {
  /* red focus ring stays per Feature 1 */
}
```

Keep the 32×32 sizing and per-variant icon color hue. Only the shadow stack
is rewritten.

## 5. Non-goals & explicit decisions to record

- **Don't rewrite `Input.jsx` props.** Add `leadingIcon` as additive only.
- **Don't change `Modal` / `Drawer` JSX structure.** All upgrades are CSS
  values only, plus a new optional subcomponent `<FieldGroup>` that
  CONSUMERS opt into.
- **Don't touch `Button.jsx`.** All button work is CSS-only (radius,
  font-weight stays at medium, no shadow change on default buttons).
- **Don't migrate existing pages.** Dashboard, WarehousePage, etc. inherit
  the new look automatically through tokens. Visual regression check is part
  of Phase 6 verification, not a code task.

## 6. Files Touched

| Path | Action | Owner role |
|---|---|---|
| `package.json` | add `@fontsource/inter` runtime dep | orchestrator (one-shot install) |
| `src/index.js` | import `@fontsource/inter/{400,500,600,700}.css` BEFORE `./index.css` | react-ui-engineer |
| `src/styles/tokens.css` | apply §4.2 / §4.3 / §4.4 / §4.5 / §4.6 changes; add new tokens | react-ui-engineer |
| `src/index.css` | swap font-family declaration to use Inter, add `font-feature-settings` | react-ui-engineer |
| `src/components/common/Input/Input.jsx` | add optional `leadingIcon: string` prop; auto-attach `calendar` for `type="date"` if no prefix/leadingIcon set | react-ui-engineer |
| `src/components/common/Input/Input.css` | tweak default padding to `0 var(--space-4)` (16px), set `.input--has-affix .input__el { padding-left: 0; }` so the affix slot owns its own gap, ensure leading-icon affix renders 16×16 glyph with `margin-left: 0; margin-right: var(--space-3)` so visual offset from the input's left edge is 16px (padding) + glyph + 12px gap, swap radius to `--radius-md` (8px) | react-ui-engineer |
| `src/components/common/Input/Input.test.jsx` | add tests: leadingIcon renders a glyph; date input auto-attaches calendar | test-engineer |
| `src/components/icons/index.jsx` | add `calendar` glyph IF MISSING (verify first; skip if it already exists) | react-ui-engineer |
| `src/components/common/Modal/Modal.css` | bump body / header / footer padding per §4.4; soft border-radius unchanged | react-ui-engineer |
| `src/components/common/Drawer/Drawer.css` | bump body / header / footer padding; title sizing → `--font-size-2xl` (22px) | react-ui-engineer |
| `src/components/common/Table/Table.css` | apply §4.9: increase padding, lighter header fill, slightly stronger row divider | react-ui-engineer |
| `src/components/common/Button/Button.css` | swap `border-radius` to `--radius-md`; nothing else | react-ui-engineer |
| `src/components/common/FieldGroup/FieldGroup.jsx` | NEW — `<FieldGroup title?>` + `<FieldGroup.Row>` | react-ui-engineer (frontend-design pass) |
| `src/components/common/FieldGroup/FieldGroup.css` | NEW — slate-50 panel, 12px radius, 20px padding | react-ui-engineer |
| `src/components/common/FieldGroup/FieldGroup.test.jsx` | NEW | test-engineer |
| `src/components/common/FieldGroup/index.js` | NEW re-export | react-ui-engineer |
| `src/components/common/index.js` | export `FieldGroup` | react-ui-engineer |
| `src/components/features/Warehouse/WarehouseTable.css` | replace the per-variant heavy shadows with the universal glass pair (§4.10) | react-ui-engineer |
| `src/components/features/Warehouse/WarehouseTable.test.jsx` | adjust any test that asserted on a specific shadow class IF such a test exists; otherwise no change | test-engineer (verify only) |

## 7. Tasks (sequential)

### Task DS-A — orchestrator: install Inter, verify package.json

```bash
cd C:/Users/DELL/Desktop/warehouse
npm install --save @fontsource/inter@^5
```

Verify it lands in `package.json`. Do NOT install other packages.

### Task DS-B — react-ui-engineer (with frontend-design skill): tokens, fonts, base CSS

1. Edit `src/styles/tokens.css` to apply every value in §4.2 / §4.3 / §4.4 /
   §4.5 / §4.6. Preserve the file's leading comment block; add a new comment
   block near the typography section noting Inter is required.
2. Edit `src/index.js` to import `@fontsource/inter/400.css`,
   `.../500.css`, `.../600.css`, `.../700.css` BEFORE `./index.css`.
3. Edit `src/index.css`:
   - body `font-family` references the new token (or add an explicit
     declaration).
   - body gains `font-feature-settings: 'cv11', 'ss01', 'ss03';`.
   - body keeps the existing antialiasing rules.

Verification: `npm run build` passes; `npm start` loads the app and `body`
computed font-family starts with "Inter".

### Task DS-C — react-ui-engineer (frontend-design): kit CSS upgrades

1. `Input.css` — radius 8px, padding `0 var(--space-4)`, leading-icon
   spacing rules.
2. `Input.jsx` — additive `leadingIcon` prop; date-type auto-attach.
   Verify the `calendar` glyph exists in `src/components/icons/index.jsx`
   (it was added in Feature 1's icon work — confirm by reading the file. If
   missing, add it: stroke-only 24×24 viewBox, width=2, rounded corners.
   Use `<Icon name="calendar" />` style consistent with the existing set.)
3. `Modal.css` / `Drawer.css` — padding bumps per §4.4; drawer title size
   bump.
4. `Table.css` — padding bump per §4.9; lighter header; slightly stronger
   row divider.
5. `Button.css` — radius `--radius-md` only.
6. `WarehouseTable.css` — replace row-action-btn shadows with the universal
   glass pair (`--shadow-glass` / `--shadow-glass-hover`). Keep the danger
   focus ring red. Keep per-variant icon hover hues.

### Task DS-D — react-ui-engineer (frontend-design): FieldGroup component

Create `src/components/common/FieldGroup/`:

```jsx
// FieldGroup.jsx
export function FieldGroup({ title, children, className = '' }) { ... }
FieldGroup.Row = function FieldGroupRow({ children, className = '' }) { ... };
```

Visual: outer panel `background: var(--color-bg-muted); border-radius:
var(--radius-lg); padding: var(--space-5); border: 1px solid var(--color-border);`.
Title (when set): `font-size: var(--font-size-xs); font-weight:
var(--font-weight-semibold); text-transform: uppercase; letter-spacing: 0.6px;
color: var(--color-text-secondary); margin-bottom: var(--space-3);`.

Stack uses `gap: var(--space-4)` between children. `FieldGroup.Row` is
`display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);` and
collapses to a single column under 480px viewport.

Export from `src/components/common/index.js`.

### Task DS-E — test-engineer: tests for kit changes

- `Input.test.jsx`: assert `<Input leadingIcon="search" />` renders an svg
  inside the prefix slot; `<Input type="date" />` renders an svg with the
  `calendar` accessible name.
- `FieldGroup.test.jsx`: renders title when provided, renders children,
  `FieldGroup.Row` lays children out horizontally (assert via class).
- Run full suite: `npm test -- --watchAll=false` — must remain green
  (existing tests assume token-driven CSS, not specific pixel values, so
  they should keep passing).

### Task DS-F — verification

```bash
cd C:/Users/DELL/Desktop/warehouse
npm test -- --watchAll=false
npm run build
```

Both must pass with no new warnings. Paste last 10 lines of each.

**Manual visual verification (orchestrator, dev server):**

1. `npm start`. Hit `/dashboard` — confirm Inter is the active font (network
   tab or computed style); cards/headings read calmer; tables breathe more.
2. Hit `/warehouse` — table row height visibly larger, row-action buttons
   sit on a "barely there" shadow that lifts on hover, primary "Add asset"
   button has 8px radius, subtle hover.
3. Open the existing Quick-Add drawer (pre-Feature-2 state). Confirm
   header padding looks generous, title is bigger/bolder, input borders are
   slate-200 with a soft blue glow on focus.
4. Compare before/after by checking out HEAD~1 in a worktree if needed —
   user said "feature correctness ≠ visual correctness", actually look.

## 8. Review Strategy

After all DS-* tasks pass test-engineer:

1. **spec-reviewer** — every value in §4 matches the committed CSS;
   `FieldGroup` API matches §4.8.
2. **code-quality-reviewer** — no hardcoded colors / sizes outside
   `tokens.css`; no Tailwind classes accidentally added; Input prop is
   additive (zero breaking changes).
3. **security-reviewer** — N/A (no auth/rules/storage touched). Skip.

## 9. Risk & Rollback

- **Risk:** Inter shifts metric vs. system font; existing fixed-width layouts
  could break visually. Mitigation: keep `--font-size-md` near the old value
  (14px vs. 15px is a 1px shift; Inter's x-height is taller, compensating).
- **Risk:** A 1-pixel padding/radius drift breaks one of the existing kit
  tests that asserted DOM structure. Mitigation: existing tests are
  structure / behavior assertions per the test-engineer convention; CSS is
  not asserted at pixel level. If something breaks, debug not paper over.
- **Rollback:** revert `tokens.css`, `index.js`, `index.css`, the four
  component CSS files, `Input.jsx`, and `WarehouseTable.css`. The
  `FieldGroup` component is additive — leaving it in place is harmless if
  unused.

## 10. Definition of Done

- Inter font loads from local bundle (verify in DevTools Network → Font tab
  shows `inter-cyrillic-ext-400-normal.woff2` etc., NOT a Google Fonts URL).
- Token values match §4 exactly.
- Drawer / modal padding visibly more generous (32px / 24px structure).
- Input default radius is 8px; on focus shows a soft blue 3px outer glow.
- Date input has a leading calendar glyph automatically.
- Table row height is ~56–60px in the comfortable (default) mode.
- Row-action buttons use the new glass shadow pair.
- `npm test -- --watchAll=false` and `npm run build` both green.
- No commit, no push (user's standing rule).
- Plan 2 (`2026-04-27-asset-kind-taxonomy.md`) declares this plan as a
  dependency; its own components consume `FieldGroup` and the new Input
  affordances when they ship.
