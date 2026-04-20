# Iteration 1 — Core UI (Inventory + Asset Detail + Transfers Inbox)

> **Status:** APPROVED (2026-04-20). User-confirmed decision: Variant B (responsive desktop + mobile, no QR scanner UI, no asset photos). All other decisions delegated to the orchestrator and fixed below.
>
> **Amendment (2026-04-20):** i18n scope expanded in-iteration. Three locales shipped now (`hy` default, `en` fallback, `ru` third). `i18next` + `react-i18next` + `i18next-browser-languagedetector` wired in Iteration 1 (not deferred). Asset-level translatable fields (`nameI18n`, `descriptionI18n`) added as optional per-asset overrides. Asset photos confirmed fully out-of-scope (schema has no image fields). See §2.1 and §11 for details.
>
> **Scope boundary:** this plan covers ONLY the three core screens that close the custody loop (storage -> issue -> receive). Dashboard, Employees, Licenses, Settings sub-pages are explicitly deferred to Iteration 2+.
>
> **Related docs:**
> - Schema: `docs/superpowers/plans/firestore-schema-v1.md`
> - Seed data: `docs/superpowers/plans/firestore-seed-templates.md`
> - Foundation: `docs/superpowers/plans/2026-04-20-iteration-0-foundation.md`

---

## 1. Iteration Goals

1. Ship a working responsive UI (desktop >=1024px, mobile <1024px) covering the **core custody flow**: browse inventory -> open asset -> initiate transfer -> recipient confirms with PIN.
2. Establish the visual system (tokens, primitives) that every future screen builds on.
3. Establish the data-layer pattern (repository -> hook -> component) for Assets and Transfers so Iteration 2 screens are a copy-paste template.
4. Meet accessibility floor (WCAG AA, 18px base, 48px tap targets, visible focus, keyboard complete).
5. Ship UI in three locales from day one: **`hy` (Armenian, default)**, **`en` (English, fallback)**, **`ru` (Russian)**. All user-facing strings go through `t()` with resources in `src/locales/{hy,en,ru}/common.json`. Language picked by `i18next-browser-languagedetector` with fallback chain `hy → en`.
6. Minimal new runtime dependencies: `i18next`, `react-i18next`, `i18next-browser-languagedetector` (user-sanctioned). No Tailwind, no UI kit, no react-hook-form, no zod. Plain CSS co-located + CSS tokens.

**Out of scope (explicit):** QR scanner UI, camera capture, asset photos (no `imageUrls` / `photoUrl` / Storage at all), server-side search, dark theme, push notifications, offline mode, hamburger menu.

### 2.1 i18n scope (NEW in this amendment)

**Three locales shipped in Iteration 1:**

| Locale | Role | Source-of-truth for UI strings? |
|---|---|---|
| `hy` | default / app primary | yes — write UI strings here first |
| `en` | fallback if `hy` key missing | yes — second authoring pass |
| `ru` | third locale | translated from `hy`/`en` |

**Library stack:** `i18next@^24`, `react-i18next@^15`, `i18next-browser-languagedetector@^8`. Init module: `src/i18n/index.js`. Resources: `src/locales/<lang>/common.json` (single namespace in Iteration 1; split into feature namespaces in Iteration 2 if files grow past ~200 keys).

**Language detection order (configured):** `localStorage` ➜ `navigator` ➜ fallback `hy`. Selected language persists to `localStorage` key `warehouse.lang`. A language switcher UI is deferred to Iteration 2 — in Iteration 1 the language is determined solely by detection + `users/{uid}.preferredLocale` when the user is logged in.

**Two axes of translation:**

1. **UI strings (i18next resources):** labels, buttons, placeholders, section titles, status labels, role names, category display names, validation messages. Source of truth is JSON files in `src/locales/`.
2. **Per-asset overrides (Firestore):** optional `nameI18n` and `descriptionI18n` objects on each asset. Used when the creator wants to provide translated names for an asset that the default language-agnostic fallback (`asset.name`) does not cover.

**What NEVER translates (stays as the literal value in any locale):**
- `sku`, `serialNumber`, `barcode`, `invoiceNumber`, `qrCodeId`
- `brand`, `model`
- `licenses.vendor`, `licenses.key`

**What translates via i18next (NOT per-asset, NOT in Firestore):**
- Category display names (Firestore stores the key like `"laptop"`; the UI renders `t('category.laptop')`).
- Status labels (`active`, `archived`, `pending`, `confirmed`, ...).
- Role labels (`user`, `admin`, `super_admin`).
- All UI chrome, buttons, navigation, empty states, error messages.

**What translates per-asset via Firestore overrides:**
- Asset `name` via `asset.nameI18n[locale]`, falling back to `asset.name`.
- Asset `description` via `asset.descriptionI18n[locale]`, falling back to `asset.description`.

**Display helper (mandatory, single source of truth):** `src/utils/i18nAsset.js` exports:
```js
// returns best localized string for the asset name
// order: nameI18n[locale] ?? nameI18n[sourceLanguage] ?? name
export function displayAssetName(asset, locale) { /* ... */ }

// same logic for description
export function displayAssetDescription(asset, locale) { /* ... */ }
```
Every component that renders an asset name MUST go through this helper; no inline `asset.nameI18n?.[x] ?? asset.name` expressions in components.

**Asset-create / edit form UX:** a collapsed (closed by default) section titled with `t('asset.form.translationsSection')`. Opening it reveals three optional text inputs (`hy` / `en` / `ru`). Leaving a field blank stores `null`/undefined for that locale — never an empty string (normalize in the repository layer).

---

## 2. Final Sitemap (8 zones)

| # | Zone | Route(s) | Iteration | Rationale |
|---|---|---|---|---|
| 1 | **Dashboard** | `/` | 2 | Landing KPIs (total assets, my pending transfers, expiring warranties). Not on the critical path yet; inventory list is the true entry point for MVP. |
| 2 | **Inventory (Assets list)** | `/inventory` | **1** | Core entry. Every user opens this first to find an asset. |
| 3 | **Asset Detail** | `/inventory/:assetId` | **1** | Full record + "Transfer" action. The pivot from "browse" to "custody change". |
| 4 | **Transfers Inbox** | `/transfers` | **1** | Incoming (pending confirm), outgoing (pending cancel), history. Closes the loop. |
| 5 | **Employees** | `/employees`, `/employees/:uid` | 2 | Admin surface. Not blocking the core flow — recipient is chosen from a searchbox on Asset Detail without needing a full page. |
| 6 | **Licenses** | `/licenses`, `/licenses/:id` | 2 | Ownership-adjacent but orthogonal; can ship after core custody works. |
| 7 | **Notifications** | inline dropdown in navbar (bell icon) | 2 | MVP shows zero-state bell; wiring to real events waits for `/notifications` collection design. **No dedicated page in MVP.** |
| 8 | **Settings** | `/settings`, sub-pages: `/settings/branches`, `/settings/departments`, `/settings/categories`, `/settings/users` | 2 | Super-admin surface. Seed data via Console is sufficient for Iteration 1. |

Auxiliary routes (Iteration 1): `/login` (already built in Iteration 0), `/403`, `/404`.

---

## 3. UX Principles for the 70-Year-Old User

Concrete, non-negotiable numbers. These drive the tokens in section 8.

| Principle | Concrete number / rule |
|---|---|
| Base font size | **18px** body, 20px list items, 24px page title, 32px hero number. Never 16px or below except for legal/footer text. |
| Minimum tap target | **48x48px** (buttons, toggles, icon buttons, row tap areas on mobile). |
| Minimum button label | **16px** label height, padded to 48px total height. |
| Line-height | **1.5** body, 1.3 headings. |
| Color contrast | **>=4.5:1** for text on background (WCAG AA). Primary button text contrast measured, not guessed. |
| Focus ring | **2px solid outline + 2px offset**, always visible, never `outline: none` without a replacement. |
| Interactive spacing | Minimum **8px gap** between two tap targets; **16px** preferred. |
| Card padding | **16px mobile, 24px desktop**. |
| Page gutter | **16px mobile, 32px desktop**. |
| Icon policy | Every icon has a text label **next to it**, not a tooltip. Icon-only buttons allowed only with `aria-label` AND an obvious context (e.g. back arrow in a detail view). |
| Error messages | Full sentence in Russian, specific cause, what to do next. Never "Error" or a raw Firebase code. |
| Copy length | Button labels <=3 words ("Передать", "Подтвердить", "Отмена"). Avoid passive voice. |
| Motion | Respect `prefers-reduced-motion: reduce`; no decorative animations over 200ms; no auto-carousels. |
| Theme | **Light only** in Iteration 1. Tokens named so dark mode can be added later without refactor. |

---

## 4. Wireframes — Priority Screens

### 4.1 Inventory List — `/inventory`

**Purpose:** list assets, filter, search, open detail.

**Data:** `useAssets({ branchId?, category?, status?, holderType?, search? })` -> live `onSnapshot` on `/assets` with default `where('status','==','active')`. Client-side filter over `name`, `sku`, `serialNumber`, `brand` when `search` is set.

**Desktop (>=1024px):**
```
+-------------------------------------------------------------------------------+
| [Sidebar 240px]         |  Инвентарь                                    [+]   |
|                         |--------------------------------------------------   |
|  [icon] Панель          |  [Поиск: _________________________]  [Фильтры v]   |
|  [icon] Инвентарь <--   |                                                    |
|  [icon] Передачи (3)    |  +-------+---------+----------+---------+------+   |
|  [icon] Ещё             |  | SKU   | Название| Категория| Владелец| Стат. |   |
|                         |  +-------+---------+----------+---------+------+   |
|  [bell 2] [avatar]      |  | LAP-01| MacBook | Ноутбук  | Хачик   | акт. |   |
|                         |  | LAP-02| ThinkPad| Ноутбук  | Склад   | акт. |   |
|                         |  | MON-01| Dell 27 | Монитор  | IT отд. | акт. |   |
|                         |  +-------+---------+----------+---------+------+   |
|                         |  Показано 3 из 127 | [< 1 2 3 ... >]                 |
+-------------------------------------------------------------------------------+
```

**Mobile (<1024px):**
```
+----------------------------------------+
| Инвентарь                          [+] |
|----------------------------------------|
| [Поиск: __________________] [Фильтр] |
|                                        |
| +------------------------------------+ |
| | LAP-01     MacBook Pro 16"         | |
| | Ноутбук * Владелец: Хачик          | |
| |                       [открыть >]  | |
| +------------------------------------+ |
| +------------------------------------+ |
| | LAP-02     ThinkPad X1             | |
| | Ноутбук * Склад: Ереван HQ         | |
| |                       [открыть >]  | |
| +------------------------------------+ |
|                                        |
| Показано 3 из 127                      |
|----------------------------------------|
| [Панель] [Инвент.] [Переда.3] [Ещё]    |
+----------------------------------------+
```

**Acceptance criteria (Inventory List):**
- AC-IL-1: On load shows spinner <=300ms, then a list populated by `onSnapshot`. First paint shows at least the header + search.
- AC-IL-2: Typing in search filters the visible list client-side with no network hit; debounce 150ms.
- AC-IL-3: Empty state (no assets, or no matches) shows a Russian message + illustration-free card.
- AC-IL-4: Each row is a full tap target >=48px on mobile. Enter / Space activates.
- AC-IL-5: Live update: when an asset's holder changes (via transfer elsewhere), the row reflects it within 2s without reload.
- AC-IL-6: Desktop table is responsive: on viewport <1024px, it collapses to the card layout above.
- AC-IL-7: Filter panel (category, status, holderType, branch) persists selections to URL query params so the view is shareable.
- AC-IL-8: No layout shift >100ms after data load (reserve skeleton row heights).

### 4.2 Asset Detail — `/inventory/:assetId`

**Purpose:** full asset record, primary CTA "Передать" (Transfer).

**Data:** `useAsset(assetId)` -> `onSnapshot` on `/assets/{id}`. History tab: `useAssetHistory(assetId)` -> query `/assets/{id}/history` ordered by `at desc`, limit 20.

**Desktop:**
```
+-------------------------------------------------------------------------------+
| [Sidebar]                | < Назад к инвентарю                                |
|                          |                                                    |
|                          | MacBook Pro 16" M3 Max           [Передать]  [...] |
|                          | LAP-00042 * Ноутбук * Active                       |
|                          |--------------------------------------------------  |
|                          |  [Сведения] [История]                              |
|                          |                                                    |
|                          |  Идентификация                                     |
|                          |   Бренд:       Apple                               |
|                          |   Модель:      MacBook Pro 16 M3 Max 2024          |
|                          |   Серийник:    C02XXXXXXXXX                        |
|                          |                                                    |
|                          |  Размещение и владелец                             |
|                          |   Филиал:      Ереван HQ                           |
|                          |   Отдел:       IT                                  |
|                          |   Владелец:    Хачик  (пользователь)               |
|                          |                                                    |
|                          |  Финансы, Гарантия, Жизненный цикл (коллапсы)      |
+-------------------------------------------------------------------------------+
```

**Mobile:** single column, sticky header with Back + CTA; sections stacked, each section collapsed by default except Идентификация + Владелец.

**Transfer modal (opens on Передать):**
```
+-------------------------------------+
| Передать актив                  [X] |
|-------------------------------------|
| Получатель                          |
| [ Поиск сотрудника: _______ ]       |
|  Хачик (IT)                         |
|  Анна (HR)                          |
|-------------------------------------|
| Причина передачи (необязательно)    |
| [ _____________________________ ]   |
|-------------------------------------|
| После создания сообщите получателю  |
| 4-значный код подтверждения.        |
|-------------------------------------|
|            [Отмена]   [Создать]     |
+-------------------------------------+
```

On "Создать": `runTransaction` writes `/transfers/{new}` with status=pending + `signaturePin` (4 random digits) + sets `assets/{id}.pendingTransferId` as soft-lock. Modal closes, toast shows "Передача создана. Код: 4821" with a "Скопировать" button. Toast dismiss requires tap (doesn't auto-hide) so the sender can read PIN out loud.

**Acceptance criteria (Asset Detail):**
- AC-AD-1: Loads asset in <=500ms cache / <=2s cold; shows skeleton in between.
- AC-AD-2: "Передать" button is disabled when the current user is not the asset holder AND not admin/super_admin. Disabled reason shown as tooltip/inline text in Russian.
- AC-AD-3: "Передать" button is disabled when `pendingTransferId != null` (asset is mid-transfer) with text "У актива уже есть активная передача".
- AC-AD-4: History tab shows reverse-chronological events; each shows type, who, when (local timezone from `branch.timezone` if available, else browser).
- AC-AD-5: Form sections are rendered **dynamically from `settings/ui_schemas.assetForm.sections`** — read once at app startup, cached in context. No hardcoded field lists in the component. Unknown fields skipped with a `console.warn`.
- AC-AD-6: Transfer modal validates: at least 1 recipient selected, recipient != current holder, recipient status == 'active'. Validation inline in Russian.
- AC-AD-7: Transfer creation is atomic: if `runTransaction` fails, nothing written, error toast in Russian with a retry button.
- AC-AD-8: After successful creation, the UI shows the PIN to the initiator until they dismiss the toast.

### 4.3 Transfers Inbox — `/transfers`

**Purpose:** recipient sees pending incoming transfers and confirms with PIN; initiator sees own outgoing and can cancel.

**Data:** `useMyTransfers(uid)` -> two parallel `onSnapshot` queries:
- `incoming`: `where('to.id','==',uid).where('status','==','pending')` ordered by `initiatedAt desc`
- `outgoing`: `where('from.id','==',uid).where('status','==','pending')` ordered by `initiatedAt desc`
- `recent`: `where(...uid in from or to).where('status','in',['confirmed','rejected','cancelled']).orderBy('updatedAt desc').limit(20)` (two queries merged client-side, since Firestore doesn't support OR across different fields without `where in`).

**Layout (desktop + mobile — same structure, different spacing):**
```
Передачи
------------------------------------------------
[Tabs: Входящие (2)  Исходящие (1)  Недавние]

Входящие — ожидают вашего подтверждения
+----------------------------------------------+
| От: Анна (HR)               TR-2026-000123   |
| MacBook Pro 16" M3 Max + 1 ещё               |
| Причина: Новый сотрудник                     |
| [ PIN: ____  ] [Подтвердить]   [Отклонить]   |
+----------------------------------------------+
+----------------------------------------------+
| От: Склад                   TR-2026-000122   |
| Монитор Dell 27"                             |
| [ PIN: ____  ] [Подтвердить]   [Отклонить]   |
+----------------------------------------------+

Исходящие — вы создали, ждут получателя
+----------------------------------------------+
| Кому: Хачик                 TR-2026-000121   |
| ThinkPad X1 Carbon                           |
| Код: 4821                   [Отменить]       |
+----------------------------------------------+

Недавние (20 последних)
  TR-2026-000118  подтверждено  19 апр * Анна -> Хачик
  TR-2026-000117  отменено       18 апр * Хачик -> Склад
  ...
```

**PIN flow (on Подтвердить):** client calls `runTransaction`:
1. Re-read `/transfers/{id}`; verify `status == 'pending'` and `signaturePin == entered`.
2. If mismatch: abort the transaction, show local error "Неверный код", no write to Firestore. Rate-limit attempts in UI: after 5 bad tries in 60s, disable the input for 30s (client-only; server-side rate limit is Iteration 2).
3. If match: in one transaction write:
   - `transfers/{id}` -> `status='confirmed'`, `confirmedAt=serverTimestamp()`, `signaturePin=null`, `updatedAt`, `updatedBy`.
   - For each `assetId`: `assets/{assetId}` -> `holderType/holderId/holder.* = to.*`, clear `pendingTransferId`.
   - For each `assetId`: `assets/{assetId}/history/{auto}` -> `eventType='transferred'`, `transferId`, `by=uid`, `diff`.
4. On success: toast "Передача подтверждена" (Russian), tab updates live.

**Rejection flow:** single update to `status='rejected'`, `rejectedAt`, clear `pendingTransferId` on each asset. History entry `rejected` optional in MVP — skipped.

**Cancellation flow (outgoing):** same shape, `status='cancelled'`, `cancelledAt`.

**Acceptance criteria (Transfers Inbox):**
- AC-TI-1: Tabs reflect real counts. Counts refresh live via `onSnapshot`.
- AC-TI-2: PIN input masks digits (`type='tel' inputMode='numeric' pattern='[0-9]*' autocomplete='one-time-code'`), 4-6 chars; paste supported.
- AC-TI-3: On wrong PIN, NO Firestore write happens (verified by absence of an `updatedAt` bump). Local error shown.
- AC-TI-4: After 5 wrong attempts, input disabled 30s with countdown.
- AC-TI-5: Rules (already deployed in Iteration 0) enforce that any successful `confirmed` write must set `signaturePin=null`. Client code matches.
- AC-TI-6: Empty states for each tab in Russian, non-snarky.
- AC-TI-7: "Отменить" on outgoing is confirmed via a small inline confirm (no modal) to avoid click fatigue.
- AC-TI-8: Recent tab shows max 20 items with "Показать больше" button that fetches next page.

---

## 5. UI Primitives — `src/components/ui/`

All primitives are plain `.jsx` + co-located `.css`, consume CSS tokens, no external UI library.

| Component | File | Props contract | Notes |
|---|---|---|---|
| **Button** | `Button/Button.jsx` | `{ variant: 'primary' \| 'secondary' \| 'danger' \| 'ghost', size?: 'md' \| 'lg', type?, disabled?, loading?, onClick?, children, ariaLabel? }` | Default size `md` = 48px height. `loading` shows Spinner + disables. |
| **Input** | `Input/Input.jsx` | `{ label, value, onChange, type?='text', error?, hint?, required?, placeholder?, autoComplete?, inputMode?, id? }` | Always a `<label>`, never a floating label. Error shown below in red. |
| **Select** | `Select/Select.jsx` | `{ label, value, onChange, options: {value,label}[], error?, required?, placeholder? }` | Native `<select>`; custom dropdown is Iteration 3. |
| **SearchableSelect** | `SearchableSelect/SearchableSelect.jsx` | `{ label, value, onChange, loadOptions: (q)=>Promise<{value,label,meta?}[]>, error?, placeholder? }` | Used for recipient picker. Debounced 200ms. Keyboard navigable. |
| **Card** | `Card/Card.jsx` | `{ as?='div', padding?='md' \| 'lg', children, onClick?, role?, tabIndex? }` | When `onClick` provided, renders `role='button' tabIndex=0` with keyboard activation. |
| **Modal** | `Modal/Modal.jsx` | `{ open, onClose, title, children, footer?, size?='sm'\|'md' }` | Focus trap, ESC closes, click-outside closes, restores focus to opener. |
| **Table** | `Table/Table.jsx` | `{ columns: {key,label,render?,sortable?}[], rows, rowKey, onRowClick?, mobileBreakpoint?=1024, cardRender?: (row)=>ReactNode }` | Desktop: `<table>`. Mobile (<1024px): `cardRender` each row. |
| **EmptyState** | `EmptyState/EmptyState.jsx` | `{ title, message, action? }` | No illustrations in Iteration 1 — text-only. |
| **Spinner** | `Spinner/Spinner.jsx` | `{ size?='md'\|'sm', label?='Загрузка...' }` | `role='status'` + sr-only label. Respects `prefers-reduced-motion`. |
| **Toast / ToastProvider** | `Toast/Toast.jsx` + `Toast/ToastProvider.jsx` | Provider exposes `useToast()` -> `{ showToast({ kind, message, action?, sticky? }) }` | `kind: 'info'\|'success'\|'error'\|'warn'`. `sticky=true` disables auto-dismiss (used for PIN display). |
| **Tabs** | `Tabs/Tabs.jsx` | `{ value, onChange, items: {key,label,badge?}[] }` | Used on Transfers Inbox and Asset Detail. |
| **Badge** | `Badge/Badge.jsx` | `{ variant: 'ok'\|'warn'\|'error'\|'neutral', children }` | Used for status pills (active, archived, pending). |
| **PageHeader** | `PageHeader/PageHeader.jsx` | `{ title, subtitle?, actions? }` | Sticky on mobile, static on desktop. |
| **BackLink** | `BackLink/BackLink.jsx` | `{ to, children }` | Used at top of detail pages. |
| **ErrorBoundary** | `ErrorBoundary/ErrorBoundary.jsx` | `{ fallback?, children }` | Route-level; Russian fallback copy. |
| **SkipLink** | `SkipLink/SkipLink.jsx` | — | Hidden until focused; jumps to `#main`. Rendered once at app root. |

Layout components (not under `ui/`, under `src/components/layout/`):
- `AppShell/AppShell.jsx` — renders `<SkipLink />`, `<TopBar />`, `<Sidebar />` (desktop) / `<BottomTabs />` (mobile), `<main id="main">{children}</main>`.
- `Sidebar/Sidebar.jsx` — 240px, icon+text items, active state, collapses to hidden <1024px.
- `BottomTabs/BottomTabs.jsx` — 4 items (Панель, Инвентарь, Передачи+badge, Ещё), 64px height, safe-area-inset-bottom padding.
- `MoreMenu/MoreMenu.jsx` — full-screen overlay opened from "Ещё" tab, lists remaining zones (Employees, Licenses, Settings, Logout).
- `TopBar/TopBar.jsx` — logo left, notifications bell center-right, avatar menu right.
- `NotificationsBell/NotificationsBell.jsx` — icon button opens dropdown with "Нет новых уведомлений" in MVP.

---

## 6. Data Layer — Repository + Hook Contracts

Location:
- Interfaces: `src/domain/repositories/AssetRepository.js`, `src/domain/repositories/TransferRepository.js`
- Adapters: `src/infra/repositories/firestoreAssetRepository.js`, `src/infra/repositories/firestoreTransferRepository.js`
- Hooks: `src/hooks/useAssets.js`, `src/hooks/useAsset.js`, `src/hooks/useAssetHistory.js`, `src/hooks/useMyTransfers.js`

### 6.1 `AssetRepository` (interface, JSDoc)

```jsdoc
/**
 * @typedef {'hy'|'en'|'ru'} AppLocale
 *
 * @typedef {Object} LocalizedText
 * @property {string} [hy]
 * @property {string} [en]
 * @property {string} [ru]
 *
 * @typedef {Object} Asset
 * @property {string} id
 * @property {string} sku
 * @property {string} name                    // source-language display name, always present
 * @property {string} description             // source-language description, always present (may be '')
 * @property {LocalizedText|null} nameI18n         // optional per-locale overrides for name
 * @property {LocalizedText|null} descriptionI18n  // optional per-locale overrides for description
 * @property {AppLocale} sourceLanguage        // REQUIRED — the locale of asset.name / asset.description
 * @property {string} category
 * @property {string} brand                    // never translated
 * @property {string} model                    // never translated
 * @property {string|null} serialNumber        // never translated
 * @property {string|null} barcode             // never translated
 * @property {string[]} tags
 * @property {string} branchId
 * @property {string|null} departmentId
 * @property {'user'|'department'|'storage'} holderType
 * @property {string} holderId
 * @property {{type:string,id:string,displayName:string}} holder
 * @property {string|null} qrCodeId          // reserved, unused in UI Iteration 1
 * @property {number|null} purchasePrice
 * @property {string} currency
 * @property {Date|null} purchaseDate
 * @property {string|null} supplier
 * @property {string|null} invoiceNumber       // never translated
 * @property {string|null} warrantyProvider
 * @property {Date|null} warrantyStart
 * @property {Date|null} warrantyEnd
 * @property {'active'|'archived'} status
 * @property {'new'|'good'|'fair'|'broken'} condition
 * @property {Date|null} acquiredAt
 * @property {Date|null} retiredAt
 * @property {string|null} pendingTransferId
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {string} createdBy
 * @property {string} updatedBy
 */

// AssetRepository contract
// subscribeList(filter, onData, onError) => unsubscribe
// subscribeOne(id, onData, onError) => unsubscribe
// subscribeHistory(assetId, onData, onError) => unsubscribe
// create(input) => Promise<string>  (returns new id)
// update(id, patch) => Promise<void>
// archive(id) => Promise<void>
```

### 6.2 `TransferRepository` contract

```
subscribeIncoming(uid, onData, onError)
subscribeOutgoing(uid, onData, onError)
subscribeRecentForUser(uid, limit, onData, onError)

createTransfer({fromHolder, toHolder, assetIds, reason}) => Promise<{id, code, pin}>
confirmTransfer({id, enteredPin}) => Promise<void>   // runs Firestore runTransaction
rejectTransfer({id}) => Promise<void>
cancelTransfer({id}) => Promise<void>
```

### 6.3 Hook shapes (consumed by components)

All hooks return the same envelope:
```
{ data, loading, error, refresh? }
```

- `useAssets(filter)` -> `{ data: Asset[], loading, error }`, subscribes on mount, unsubscribes on unmount. Re-subscribes on `filter` change.
- `useAsset(id)` -> `{ data: Asset|null, loading, error }`.
- `useAssetHistory(id)` -> `{ data: HistoryEvent[], loading, error }`.
- `useMyTransfers()` -> `{ incoming, outgoing, recent, loading, error }` (object of arrays).

### 6.4 Invariants enforced in adapters

- `firestoreAssetRepository` is the ONLY module in the app that imports from `firebase/firestore`.
- No component / page / hook body imports `firebase/firestore` directly.
- All timestamps are converted `Timestamp -> Date` at the adapter boundary before returning to hooks.
- All writes set `updatedAt = serverTimestamp()` and `updatedBy = auth.currentUser.uid`. Writes never accept a client clock.

---

## 7. Routing & Guards

`src/components/routing/AppRouter.jsx` defines all routes. `src/config/routes.js` exports the nav config consumed by Sidebar and BottomTabs.

| Path | Element | Guard | Status in Iteration 1 |
|---|---|---|---|
| `/login` | `<LoginPage />` | public | already shipped |
| `/` | `<DashboardPage />` | `<RequireAuth>` | **stub** — shows `<RoutePlaceholder title='Панель'/>` |
| `/inventory` | `<InventoryPage />` | `<RequireAuth>` | **build** |
| `/inventory/:assetId` | `<AssetDetailPage />` | `<RequireAuth>` | **build** |
| `/transfers` | `<TransfersPage />` | `<RequireAuth>` | **build** |
| `/403` | `<ForbiddenPage />` | public | build (static page) |
| `/404` | `<NotFoundPage />` | public | build (static page) |
| `*` | redirect to `/404` | — | build |

Guards:
- `<RequireAuth>` already exists from Iteration 0; reused as-is.
- `<RoleGate role='admin'>` exists, not needed by any Iteration 1 route (all three core routes are accessible to `user`).

Navigation config sample (`src/config/routes.js`):
```jsx
export const PRIMARY_NAV = [
  { key: 'dashboard', to: '/',          label: 'Панель',    icon: 'home' },
  { key: 'inventory', to: '/inventory', label: 'Инвентарь', icon: 'box'  },
  { key: 'transfers', to: '/transfers', label: 'Передачи',  icon: 'swap', badge: 'incomingPending' },
  { key: 'more',      to: '#more',      label: 'Ещё',       icon: 'menu' },
];
```

---

## 8. CSS Tokens — `src/styles/tokens.css`

Imported once in `src/index.css` via `@import './styles/tokens.css';`. Every other stylesheet references tokens; no raw hex values below this layer.

```css
:root {
  /* ---------- color ---------- */
  --color-bg:            #FAFBFC;  /* app background */
  --color-surface:       #FFFFFF;  /* cards, modals */
  --color-surface-alt:   #F2F4F7;  /* row hover, subtle fills */
  --color-border:        #D9DEE5;  /* default borders */
  --color-border-strong: #B0B8C1;  /* focused / hovered borders */

  --color-text:          #111827;  /* primary text — contrast 15:1 on bg */
  --color-text-muted:    #4B5563;  /* secondary text — contrast 7:1 on bg */
  --color-text-subtle:   #6B7280;  /* tertiary — contrast 4.6:1 (AA min) */
  --color-text-inverse:  #FFFFFF;

  --color-primary:       #1D4ED8;  /* blue-700; contrast on white 8.6:1 */
  --color-primary-hover: #1E40AF;
  --color-primary-active:#1E3A8A;
  --color-primary-weak:  #DBEAFE;  /* bg for primary chips / focus halo */

  --color-success:       #047857;  /* green-700 */
  --color-success-weak:  #D1FAE5;
  --color-warn:          #B45309;  /* amber-700 */
  --color-warn-weak:     #FEF3C7;
  --color-error:         #B91C1C;  /* red-700 — contrast 6.8:1 on white */
  --color-error-weak:    #FEE2E2;

  --color-focus-ring:    #2563EB;

  /* ---------- spacing (4-based) ---------- */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ---------- radius ---------- */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* ---------- font ---------- */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Inter", "Helvetica Neue", Arial, sans-serif;
  --font-size-xs:   14px;
  --font-size-sm:   16px;
  --font-size-base: 18px;  /* <-- app baseline, NOT 16px */
  --font-size-lg:   20px;
  --font-size-xl:   24px;
  --font-size-2xl:  32px;

  --line-height-tight: 1.3;
  --line-height-base:  1.5;

  --font-weight-regular: 400;
  --font-weight-medium:  500;
  --font-weight-semibold:600;
  --font-weight-bold:    700;

  /* ---------- shadows ---------- */
  --shadow-sm:  0 1px 2px rgba(15,23,42,0.06);
  --shadow-md:  0 4px 12px rgba(15,23,42,0.08);
  --shadow-lg:  0 12px 32px rgba(15,23,42,0.12);

  /* ---------- motion ---------- */
  --duration-fast:   120ms;
  --duration-base:   180ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);

  /* ---------- sizing ---------- */
  --size-tap-min:    48px;  /* minimum touch target */
  --size-input:      48px;
  --size-sidebar:    240px;
  --size-bottom-nav: 64px;
}

html { font-size: var(--font-size-base); }
body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: var(--line-height-base);
}

*:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

---

## 9. Acceptance Criteria — Summary Table

| Screen | Criterion IDs | Count |
|---|---|---|
| Inventory List | AC-IL-1 .. AC-IL-8 | 8 |
| Asset Detail + Transfer modal | AC-AD-1 .. AC-AD-8 | 8 |
| Transfers Inbox | AC-TI-1 .. AC-TI-8 | 8 |
| Global (all screens) | AC-G-1 .. AC-G-6 (below) | 6 |

**Global acceptance (cross-cutting):**
- AC-G-1: `npm run build` succeeds with zero new warnings.
- AC-G-2: `npm test -- --watchAll=false` passes. Smoke test per page + unit tests for repositories (mocked Firestore) + one full transfer-confirm integration test against the Firestore emulator OR fully mocked SDK.
- AC-G-3: Lighthouse Accessibility score >=95 on `/inventory` desktop + mobile viewports.
- AC-G-4: Keyboard-only walkthrough of the full flow (login -> find asset -> transfer -> confirm) possible without a mouse.
- AC-G-5: Screen reader (NVDA/VoiceOver) announces page title on route change (via `<h1>` focus or `document.title`).
- AC-G-6: All Russian strings live in component files (no i18n wiring yet); no stray English except placeholder attributes where Russian is absurd (e.g. `autoComplete` values).

---

## 10. Deferred to Iteration 2+

Explicit list so nothing is "forgotten" — these are simply not Iteration 1:

- `/` Dashboard (KPI cards, pending transfers widget)
- `/employees`, `/employees/:uid`
- `/licenses`, `/licenses/:id`
- `/settings` + `/settings/branches`, `/departments`, `/categories`, `/users`
- `/notifications` full page (keeping bell icon in navbar as zero-state in MVP)
- QR code scan UI, camera capture, asset photos
- Dark theme
- i18next wiring (extract hardcoded Russian strings -> `src/locales/ru/*.json` + add `en`)
- Server-side search (`_searchKeywords[]` or Algolia)
- `react-hook-form` / `zod` migration (re-evaluate after first real form pain)
- Tailwind activation
- Server-side PIN rate limiting via Cloud Function
- Cross-entity activity log
- Offline support / PWA
- Push notifications / in-app notifications persistence

---

## 11. Dependency Impact

- **New runtime dependencies (user-sanctioned):** `i18next`, `react-i18next`, `i18next-browser-languagedetector`. Installed via `npm install --save i18next react-i18next i18next-browser-languagedetector`. Pinned in `package.json` as part of the i18n scaffolding commit.
- Already-pinned: `firebase`, `react-router-dom` are already in `package.json` (verified 2026-04-20).
- **`qrCodeId` field** added to the domain `Asset` typedef (see §6.1) as `string | null`, optional, unused in UI. The Firestore schema doc (`firestore-schema-v1.md`, §4.4) gets a one-line addition in its asset field list: `"qrCodeId":     null,                     // string | null — reserved for future QR scanner feature; not rendered in Iteration 1 UI`. No migration needed since the field is optional and null for all existing docs.
- **i18n field additions to Firestore schema** (see `firestore-schema-v1.md` §4.4 and §4.1):
  - `assets.nameI18n?: { hy?, en?, ru? } | null` — optional per-locale override for the asset name.
  - `assets.descriptionI18n?: { hy?, en?, ru? } | null` — optional per-locale override for the description.
  - `assets.sourceLanguage: 'hy' | 'en' | 'ru'` — REQUIRED, default = creator's current UI locale.
  - `users.preferredLocale: 'hy' | 'en' | 'ru'` — defaults to `'hy'`.
  - **No migration script needed.** All new fields are additive. Reader code must treat missing `nameI18n`/`descriptionI18n` as `null` and missing `sourceLanguage` as `'hy'`. The existing seed asset continues to work without modification; the seed script may be updated to populate `sourceLanguage` on newly seeded docs going forward but must NOT rewrite pre-existing ones.
- No changes to `firestore.rules` in Iteration 1 (the PIN-clearing rule already exists from Iteration 0; the new optional fields piggy-back on the existing asset-write rule with no new constraints).

---

## 12. Task Breakdown (dependency order) — for Execute phase

Each row = one atomic task dispatched to exactly one implementer. `test-engineer` runs after EVERY row before the next begins.

| # | Task | Implementer | Commit | Depends on |
|---|---|---|---|---|
| 1 | Extend `Asset` typedef (add `nameI18n`, `descriptionI18n`, `sourceLanguage`, `qrCodeId`); extend `UserProfile` typedef with `preferredLocale`. Export `APP_LOCALES`, `DEFAULT_LOCALE`, `toAppLocale()` narrower. Update `firestore-schema-v1.md` §4.1 (users) and §4.4 (assets) with the same fields. | domain-modeler | 1 feat(domain) | — |
| 2 | Install `i18next`, `react-i18next`, `i18next-browser-languagedetector`; scaffold `src/i18n/index.js` + `src/locales/{hy,en,ru}/common.json` with initial keys (app.title, common.loading, common.cancel, common.save, common.confirm, nav.*, auth.* — existing login strings). Wire `import './i18n'` in `src/index.js`. Update existing components (LoginForm, LoginPage, DashboardPage, ForbiddenPage, NotFoundPage, AppLayout) to use `t()` for all visible strings. Create `src/utils/i18nAsset.js` helper. | i18n-engineer | 2 feat(i18n) | 1 |
| 3 | Create `src/styles/tokens.css`; import from `src/index.css`; update `<title>` in `public/index.html` to localized fallback. Build UI primitives under `src/components/ui/`: Button, Input, Select, Card, Modal, Spinner, Badge, EmptyState, PageHeader, BackLink, Tabs, Toast(+Provider). All strings internal to the primitives go through `t()`. | react-ui-engineer | 3 feat(ui-kit) | 2 |
| 4 | Define `AssetRepository` + `TransferRepository` interfaces under `src/domain/repositories/`. | domain-modeler | 4 feat(inventory) split A | 2 |
| 5 | Implement `firestoreAssetRepository` (subscribe / CRUD). Normalize `nameI18n`/`descriptionI18n`: blank-string locales dropped; if the whole object empty → stored `null`. | firebase-engineer | 4 feat(inventory) split A | 4 |
| 6 | Build hooks `useAssets`, `useAsset`, `useAssetHistory`. Build `InventoryPage` + `AssetCard` + `AssetTable` (use `displayAssetName` helper with current locale). | react-ui-engineer | 4 feat(inventory) split B | 3, 5 |
| 7 | Build `AssetDetailPage` reading `settings/ui_schemas.assetForm.sections`. Render `displayAssetName` / `displayAssetDescription` at the top. Render "translations" collapsed section in the form (deferred to actual Asset form in Iteration 2 — for Iteration 1 the detail page is read-only if no edit form needed yet). | react-ui-engineer | 5 feat(asset) | 6 |
| 8 | Implement `firestoreTransferRepository` (subscribe, create, confirm via `runTransaction`, reject, cancel). | firebase-engineer | 6 feat(transfers) split A | 5 |
| 9 | Build SearchableSelect primitive + TransferModal + `useMyTransfers` hook + TransfersPage (Inbox/Outbox/Recent tabs with PIN flow). | react-ui-engineer | 6 feat(transfers) split B | 3, 7, 8 |
| 10 | Write / strengthen tests for repositories (mocked Firestore) + hooks + `i18nAsset` helper. | test-engineer | 7 test | all above |
| 11 | Documentation sweep: ensure `firestore-schema-v1.md` and this plan are consistent with i18n decisions; add entry to Change Log in both. | orchestrator | 8 docs | — (can be done first) |
| 12 | Phase 5 review cycle (spec + code-quality; security auto-triggered for transfer-flow and permissions). | reviewers | — | 9, 10 |
| 13 | Phase 6 verify (`npm test`, `npm run build`). | orchestrator | — | 12 |

**Split-commit sequence (matches user's specification):**
1. `feat(domain): add i18n fields to Asset + User schema`
2. `feat(i18n): scaffold i18next with hy/en/ru locales`
3. `feat(ui-kit): base primitives (Button, Input, Card, Modal, Table, ...)`
4. `feat(inventory): Assets list page with search/filter`
5. `feat(asset): Asset Detail page`
6. `feat(transfers): Transfers Inbox + initiate flow`
7. `test: add coverage for repositories + hooks`
8. `docs: update schema + plan with i18n decisions`

Total: ~10 implementer dispatches, each gated by `test-engineer`.

---

## 13. Verification Commands (Phase 6)

```bash
cd C:/Users/DELL/Desktop/warehouse
npm test -- --watchAll=false
npm run build
```

Expected:
- Tests: all passing, no skipped suites.
- Build: succeeds, no new warnings beyond the CRA baseline.

Manual verification walkthrough:
1. Log in as a `user` seed account that holds at least one asset.
2. Open `/inventory`, search by SKU, filter by category; confirm results update live when an admin in another tab changes an asset.
3. Open an asset, click "Передать", pick a recipient, submit; confirm toast shows PIN, sticks until dismissed.
4. Log in as the recipient in another browser profile, open `/transfers`, see the pending incoming transfer, enter PIN, confirm.
5. Verify the original inventory row's holder now shows the recipient, within 2s, without reload.
6. Keyboard-only repeat of steps 2-5 without touching the mouse.

---

## 14. Rollback Notes

- Every Iteration 1 screen is additive; rolling back is `git revert` of the feature commits.
- No Firestore schema migrations in Iteration 1 (`qrCodeId` is optional — omitting it is still valid).
- No rules changes — rollback of rules not applicable.
- Stubbed routes (`/`, `/403`, `/404`) are safe defaults; removing them reverts to 404 behavior.

---

## 15. Change Log

- **2026-04-20** — Initial plan. User-approved variant B (responsive desktop+mobile), QR kept as schema-only reserved field, no asset photos, Russian-first UI with i18n wiring deferred, no new runtime deps, plain CSS tokens + co-located stylesheets.
- **2026-04-20 (amendment)** — i18n brought into Iteration 1. Three locales shipped: `hy` (default), `en` (fallback), `ru`. Added runtime deps: `i18next`, `react-i18next`, `i18next-browser-languagedetector` (user-sanctioned). Asset schema gains optional `nameI18n`, `descriptionI18n`, and required `sourceLanguage`. User profile gains `preferredLocale`. Asset photos confirmed fully out-of-scope (no `imageUrls` / `photoUrl` / Storage). Task breakdown restructured into 8 split commits.
