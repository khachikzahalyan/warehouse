# Firestore Schema v1 — Warehouse Management System

> **Status:** DRAFT, user-approved (2026-04-20). Single source of truth for all Firestore collections in this product. Locked decisions below override the schema sketch in the orchestrator agent doc and in `2026-04-20-iteration-0-foundation.md`.
>
> **Firebase project id (authoritative):** `warehouse-8ec61`. Any other id (e.g. `warehouse-39357`) that still appears in the repo is stale and must be corrected by the user in `.env.local`.

---

## 1. Locked Decisions (user-confirmed, 2026-04-20)

1. **Role model — 3 roles, not 4.** Roles enum = `user | admin | super_admin`. This supersedes the earlier `admin | manager | viewer` sketch in Iteration 0 and the `admin | manager | operator | viewer` sketch in the orchestrator agent. Role is stored at `users/{uid}.system.role` (not at a top-level `role` field — see §4.1).
2. **No image storage in MVP.** `assets` docs have no `imageUrls`, `imagePath`, or any media fields. Firebase Storage is not configured in this iteration.
3. **Collection creation method:** manual, via the Firebase Console, using the JSON templates in `docs/superpowers/plans/firestore-seed-templates.md`. No `firebase-admin` seeding script in this iteration.
4. **Multi-branch scope is out of MVP.** Branches exist as a top-level collection (see §4.3) so that assets/users/transfers can reference one, but no `scope` / `scopeBranchIds` role-level access restrictions are enforced yet. Added to the v2 backlog: role-level branch scope (§7).
5. **Dashboard stats cached collection is deferred.** MVP dashboards use `getCountFromServer()` live. Add `/dashboard_stats` when counts become a latency problem.
6. **Timestamps & authorship on every document.** Every doc in every collection carries `createdAt`, `updatedAt`, `createdBy`, `updatedBy`. Timestamps are written server-side via `serverTimestamp()`. Never set from client clock. For docs created manually in the Console, use the Console's "Timestamp" type picker — see seed-templates doc.
7. **Licenses assignments shape — split arrays.** `licenses/{id}.assignments` is `{ assetIds: string[], userIds: string[] }`, NOT a polymorphic mixed array. Rationale: clean `array-contains` indexes, unambiguous referential integrity, no discriminator field.
8. **Assets `holder` — object + flat mirrors.** `assets/{id}` carries both a structured `holder: { type, id, displayName }` object AND flat `holderType` / `holderId` fields at the document root. The flat fields are what Firestore indexes on for list/filter queries (`where('holderType','==','user')`); the nested object is what the UI reads when rendering. They are written in a single batch and must stay in sync.
9. **Flat asset fields.** No nested `identity`, `financial`, `warranty`, `lifecycle` sub-objects. All fields live at the asset document root for trivial indexing and simpler rules. The UI layer may group them visually.
10. **`accessories` category is removed from MVP.** `settings/global_lists.categories` omits it; there are no accessory stock or accessory-log collections in MVP (they move to v2).
11. **Transfers `signatureUrl` is kept as a nullable string for schema stability, but its MVP value is always `null`.** Instead, MVP transfers record a textual PIN confirmation in `signaturePin` (a string, never logged, 4–8 chars). When we add Storage in v2, `signatureUrl` will point to a handwritten-signature PNG in `gs://.../transfers/{id}/signature.png`.

## 2. MVP vs. v2 Collection Set

### MVP collections (this iteration)
| # | Path | Kind | Purpose |
|---|---|---|---|
| 1 | `/users/{uid}` | top-level | User profile + system role. Doc id == Firebase Auth uid. |
| 2 | `/branches/{branchId}` | top-level | Physical site / office / warehouse location. |
| 3 | `/departments/{deptId}` | top-level | Org unit inside a branch (HR, IT, Ops, ...). `branchId` FK. |
| 4 | `/assets/{assetId}` | top-level | Tracked asset (hardware, furniture, vehicle, license holder, ...). |
| 5 | `/assets/{assetId}/history/{eventId}` | subcollection | Append-only audit trail of the asset: created, updated, transferred, archived. |
| 6 | `/licenses/{licenseId}` | top-level | Software / subscription license; assignable to assets and/or users. |
| 7 | `/transfers/{transferId}` | top-level | Custody transfer of one or more assets from holder A → holder B, PIN-confirmed. |
| 8 | `/settings/{docId}` | top-level (single-doc slots) | Global configuration. MVP slots: `ui_schemas`, `global_lists`. |

### v2 collections (deferred, documented for future alignment)
| Path | Why deferred |
|---|---|
| `/accessoryStock/{itemId}` | No accessories in MVP. |
| `/accessoryLogs/{logId}` | Same. |
| `/notifications/{id}` | Needs a delivery decision (in-app vs. email vs. FCM) — not in MVP. |
| `/dashboard_stats/{windowId}` | MVP uses live `getCountFromServer()`. Add when latency forces it. |
| `/activity_logs/{logId}` | Not needed yet — `assets/{id}/history` covers asset-scoped audit; cross-entity activity log deferred. |

## 3. Cross-cutting Conventions

### 3.1 Document metadata (mandatory on every doc)
```
createdAt:   Timestamp (serverTimestamp)
updatedAt:   Timestamp (serverTimestamp)
createdBy:   string (Firebase Auth uid of writer)
updatedBy:   string (Firebase Auth uid of writer)
```
Reads: clients treat `createdAt`/`updatedAt` as `Timestamp` objects; convert via `.toDate()` at the UI edge.

### 3.2 Soft-delete
- All primary entities (`assets`, `licenses`, `users`, `branches`, `departments`) carry `status: 'active' | 'archived'`. Archival is a soft-delete (flip the field, write a `history` entry).
- Hard delete is reserved for `super_admin` on `settings` docs only, and even then through the Console for MVP.
- Query default: UI lists `status == 'active'` unless the user opens an "Archived" view.

### 3.3 References
- Foreign keys are stored as string doc ids (e.g. `branchId: 'br_HQ'`), never as Firestore `DocumentReference` objects. Rationale: portable JSON, cheap deserialization, easy backups.
- Join is resolved in hooks on the client (MVP scale) or via a denormalized field when a single join is hot (e.g. `assets.holderDisplayName` alongside `holderId`).

### 3.4 Timestamps in manual Console seeding
- The Console's "JSON import" cannot set a `serverTimestamp` sentinel. When creating seed docs by hand, pick the field type **Timestamp** and paste an ISO-8601 datetime (e.g. `2026-04-20T12:00:00Z`). A later `updatedAt`-on-write trigger (or just regular app writes) will replace them with server time.

### 3.5 Document id conventions
| Collection | Id strategy |
|---|---|
| `users` | Firebase Auth `uid` (32-char). |
| `branches` | short slug prefixed `br_` (e.g. `br_HQ`, `br_yerevan`). |
| `departments` | short slug prefixed `dp_` (e.g. `dp_it`, `dp_hr`). |
| `assets` | Firestore auto-id. Human-readable `sku` is a field, not the id. |
| `assets/{id}/history` | Firestore auto-id. |
| `licenses` | Firestore auto-id. Human-readable `key` or `name` is a field. |
| `transfers` | Firestore auto-id. Human-readable `code` (e.g. `TR-2026-000123`) is a field. |
| `settings` | Fixed keys: `ui_schemas`, `global_lists`. |

---

## 4. Collection Schemas

### 4.1 `/users/{uid}`

**Purpose:** profile + role for every authenticated user. Doc id MUST equal the Firebase Auth uid.

```jsonc
{
  // identity (never client-writable except by the user themselves on limited fields)
  "email":       "khach@example.com",       // string, required, unique (enforced by Auth, not Firestore)
  "displayName": "Khach",                   // string, required
  "phone":       "+374 55 123 456",         // string | null
  "photoUrl":    null,                      // string | null — from Auth provider; NOT self-uploaded (no Storage in MVP)

  // organizational
  "branchId":    "br_HQ",                   // string | null — primary branch (FK → branches)
  "departmentId":"dp_it",                   // string | null — primary department (FK → departments)
  "jobTitle":    "Warehouse Operator",      // string | null

  // system (only super_admin writes these)
  "system": {
    "role":   "user",                       // 'user' | 'admin' | 'super_admin' — REQUIRED
    "status": "active",                     // 'active' | 'archived' | 'suspended'
    "lastLoginAt": null                     // Timestamp | null — updated by app on login
  },

  // metadata
  "createdAt":  "<Timestamp>",
  "updatedAt":  "<Timestamp>",
  "createdBy":  "<uid>",                    // for self-created: equals the user's own uid
  "updatedBy":  "<uid>"
}
```

**Indexes needed:** `system.role` (single); composite `branchId + system.role` for "who's in this branch with this role"; composite `system.status + updatedAt desc` for the users list.

**Role write authority:**
- `super_admin` can create/update any user, including promoting to `admin` or another `super_admin`.
- `admin` can create/update users whose `system.role` is `user` or `admin`, but MUST NOT create or modify a `super_admin` doc.
- `user` can update only their own `displayName`, `phone`, and `photoUrl`; every other field (especially `system.*`) is read-only for them.
- Self-provisioning of `system.role` by the user themselves is forbidden.

### 4.2 `/branches/{branchId}`

**Purpose:** physical sites / offices / warehouses. Referenced by `users`, `departments`, `assets.location`, `transfers`.

```jsonc
{
  "id":        "br_HQ",                     // mirror of doc id, convenience
  "name":      "Yerevan HQ",
  "code":      "YER",                       // short uppercase code for display
  "address":   "1 Mashtots Ave, Yerevan",
  "timezone":  "Asia/Yerevan",              // IANA tz — used for local-time display
  "status":    "active",                    // 'active' | 'archived'
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>",
  "createdBy": "<uid>",
  "updatedBy": "<uid>"
}
```

**Writes:** `admin` and `super_admin` only.

### 4.3 `/departments/{deptId}`

**Purpose:** organizational unit inside a branch. Used as a facet for assets (a laptop belongs to IT) and users.

```jsonc
{
  "id":        "dp_it",
  "name":      "IT",
  "branchId":  "br_HQ",                     // FK → branches; REQUIRED
  "managerUid":"<uid>",                     // string | null — user who owns the department
  "status":    "active",                    // 'active' | 'archived'
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>",
  "createdBy": "<uid>",
  "updatedBy": "<uid>"
}
```

**Writes:** `admin` and `super_admin`.

### 4.4 `/assets/{assetId}`

**Purpose:** the primary tracked entity. Hardware, furniture, vehicles, anything assigned to a holder (user or department).

```jsonc
{
  // identity
  "sku":          "LAP-00042",              // string, human-readable, REQUIRED, unique-by-convention
  "name":         "MacBook Pro 16\" M3 Max",
  "description":  "Space Black, 64 GB / 2 TB",
  "category":     "laptop",                 // must be a value from settings/global_lists.categories
  "brand":        "Apple",
  "model":        "MacBook Pro 16 M3 Max 2024",
  "serialNumber": "C02XXXXXXXXX",           // string | null; unique-by-convention
  "barcode":      null,                     // string | null
  "tags":         ["m3","16in"],            // string[]; searchable via array-contains

  // location & ownership (flat for indexes)
  "branchId":     "br_HQ",                  // FK; REQUIRED
  "departmentId": "dp_it",                  // FK | null
  "holderType":   "user",                   // 'user' | 'department' | 'storage' — REQUIRED (flat, indexed)
  "holderId":     "<uid or dp_it or br_HQ>",// REQUIRED (flat, indexed)
  "holder": {                               // denormalized mirror for UI
    "type":        "user",
    "id":          "<uid>",
    "displayName": "Khach"
  },

  // financial
  "purchasePrice":    2499.00,              // number | null
  "currency":         "USD",                // ISO 4217; default from settings/global_lists.currencies
  "purchaseDate":     "<Timestamp>",        // Timestamp | null
  "supplier":         "Apple Armenia",      // string | null (free-text in MVP; normalize to /suppliers in v2)
  "invoiceNumber":    "INV-2024-001",       // string | null

  // warranty
  "warrantyProvider": "AppleCare+",         // string | null
  "warrantyStart":    "<Timestamp>",        // Timestamp | null
  "warrantyEnd":      "<Timestamp>",        // Timestamp | null

  // lifecycle
  "status":     "active",                   // 'active' | 'archived' — soft delete
  "condition":  "new",                      // 'new' | 'good' | 'fair' | 'broken'
  "acquiredAt": "<Timestamp>",              // Timestamp | null
  "retiredAt":  null,                       // Timestamp | null

  // metadata
  "createdAt":  "<Timestamp>",
  "updatedAt":  "<Timestamp>",
  "createdBy":  "<uid>",
  "updatedBy":  "<uid>"
}
```

**Indexes needed:**
- single: `sku`, `serialNumber`, `branchId`, `departmentId`, `holderType`, `holderId`, `status`, `category`, `tags` (array).
- composite: `branchId + status + updatedAt desc`; `holderType + holderId + status`; `category + branchId + updatedAt desc`.

**Writes:** `admin` and `super_admin` for full CRUD. `user` never writes an asset directly — they initiate a **transfer** (§4.7) to change custody of an asset they already hold.

**Invariants enforced at the app layer (rules can't check them all):**
- `holder.type == holderType` and `holder.id == holderId` always.
- If `holderType == 'user'`, `holderId` is a valid uid that exists in `/users/`.
- If `holderType == 'department'`, `holderId` is a valid dept id that exists in `/departments/`.
- If `holderType == 'storage'`, `holderId == branchId`.
- `category ∈ settings/global_lists.categories`.
- On status transition → `archived`, write an entry to `/assets/{id}/history`.

### 4.5 `/assets/{assetId}/history/{eventId}`

**Purpose:** append-only audit trail per asset. Every meaningful mutation produces a history entry.

```jsonc
{
  "eventType": "transferred",               // 'created' | 'updated' | 'transferred' | 'archived' | 'unarchived'
  "at":        "<Timestamp>",               // event time (server)
  "by":        "<uid>",                     // actor
  "diff": {                                 // minimal patch describing the change
    "holderType": { "from": "storage", "to": "user" },
    "holderId":   { "from": "br_HQ",   "to": "<uid>" }
  },
  "transferId": "<transferId>",             // string | null — set when eventType == 'transferred'
  "note":       "Issued to new hire"        // string | null
}
```

**Writes:** append-only. Never updated, never deleted by clients. Allowed by same roles that can write the parent asset — but in MVP rules we keep it simple: write by `admin` / `super_admin`, and additionally a `user` may append to history for an asset they hold **only** when the write is part of a confirmed transfer (enforced indirectly via `transfers` rules — the client writes asset + history + transfer in one batch).

### 4.6 `/licenses/{licenseId}`

**Purpose:** software and subscription licenses. Assigned to assets (e.g. a Windows key tied to a specific laptop) and/or users (e.g. a Figma seat tied to a person).

```jsonc
{
  "name":          "Microsoft 365 Business Premium",
  "vendor":        "Microsoft",
  "key":           "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX", // string | null; sensitive — see rules
  "type":          "subscription",                  // 'perpetual' | 'subscription' | 'oem' | 'volume'
  "seatsTotal":    25,                              // integer | null
  "seatsUsed":     8,                               // integer | null; MUST equal assignments.assetIds.length + assignments.userIds.length when both are tracked per-seat
  "purchaseDate":  "<Timestamp>",                   // Timestamp | null
  "expiresAt":     "<Timestamp>",                   // Timestamp | null
  "cost":          1250.00,                         // number | null
  "currency":      "USD",

  "assignments": {                                  // SPLIT arrays, not a polymorphic mixed array
    "assetIds": ["<assetId1>", "<assetId2>"],       // string[]
    "userIds":  ["<uid1>"]                          // string[]
  },

  "status":        "active",                        // 'active' | 'archived'
  "notes":         "Renews annually on 2027-01-15",

  "createdAt":     "<Timestamp>",
  "updatedAt":     "<Timestamp>",
  "createdBy":     "<uid>",
  "updatedBy":     "<uid>"
}
```

**Indexes needed:** `vendor`, `status`, `expiresAt`, `assignments.assetIds` (array), `assignments.userIds` (array).

**Writes:** `admin` and `super_admin`.

**Security note on `key`:** the license key itself is sensitive. MVP rule: readable by `admin` and `super_admin`, and by a `user` if and only if they appear in `assignments.userIds`. The client-side asset-detail screen should NEVER show a key assigned to a DIFFERENT user. Enforced in rules (§ firestore.rules).

### 4.7 `/transfers/{transferId}`

**Purpose:** a custody change event for one or more assets. Two-party handshake (initiator → recipient) with a PIN confirmation. Replaces / augments the `assets/{id}/history` entry with a richer object.

```jsonc
{
  "code":        "TR-2026-000123",          // human-readable, monotonic; generated app-side
  "assetIds":    ["<assetId1>", "<assetId2>"], // string[], REQUIRED, non-empty

  "from": {
    "type":        "user",                   // 'user' | 'department' | 'storage'
    "id":          "<uid>",
    "displayName": "Anna"
  },
  "to": {
    "type":        "user",
    "id":          "<uid>",
    "displayName": "Khach"
  },

  "reason":      "New hire provisioning",   // string | null
  "status":      "pending",                 // 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  "initiatedAt": "<Timestamp>",             // server ts when created
  "confirmedAt": null,                      // Timestamp | null — set on status -> 'confirmed'
  "rejectedAt":  null,
  "cancelledAt": null,

  "signaturePin": "4821",                   // string | null — 4–8 chars; server-only readable (see rules); CLEARED after confirmation
  "signatureUrl": null,                     // string | null — reserved for v2 Storage integration; always null in MVP
  "notes":        null,

  "createdAt":   "<Timestamp>",
  "updatedAt":   "<Timestamp>",
  "createdBy":   "<uid>",                   // == from.id when initiator is the current holder
  "updatedBy":   "<uid>"
}
```

**State machine:**
```
pending ──(recipient enters correct PIN)──▶ confirmed
pending ──(recipient rejects)───────────────▶ rejected
pending ──(initiator cancels)───────────────▶ cancelled
```
Only `pending` → {`confirmed`,`rejected`,`cancelled`} transitions are allowed. Terminal states are immutable.

**On `confirmed`, the client writes (in one `runTransaction`):**
1. `transfers/{id}` — status/confirmedAt/signaturePin=null.
2. For each `assetId` in `assetIds`: `assets/{assetId}` — update `holderType`, `holderId`, `holder.*`, `updatedAt`, `updatedBy`.
3. For each `assetId`: `assets/{assetId}/history/{autoId}` — eventType `transferred`, `transferId` set.

**Writes (rules):**
- Create: `admin`, `super_admin`, or a `user` where `from.type == 'user' && from.id == request.auth.uid` (a user initiates a transfer out of their own custody).
- Update to `confirmed`: only the user whose uid matches `to.id` (if `to.type == 'user'`), or an `admin` / `super_admin`.
- Update to `rejected`: same as above.
- Update to `cancelled`: only the initiator (`createdBy == request.auth.uid`) or `admin` / `super_admin`.
- Delete: never from client.

### 4.8 `/settings/{docId}` — global configuration

Two fixed docs in MVP. Writes restricted to `super_admin`.

#### 4.8.1 `/settings/global_lists`
```jsonc
{
  "categories": [
    "laptop","desktop","monitor","peripheral",
    "phone","tablet","furniture","vehicle","other"
    // NOTE: "accessories" is intentionally omitted — no accessory stock in MVP
  ],
  "currencies":  ["USD","EUR","AMD","RUB"],
  "conditions":  ["new","good","fair","broken"],
  "assetStatuses":    ["active","archived"],
  "transferStatuses": ["pending","confirmed","rejected","cancelled"],
  "licenseTypes":     ["perpetual","subscription","oem","volume"],
  "userRoles":        ["user","admin","super_admin"],
  "createdAt":   "<Timestamp>",
  "updatedAt":   "<Timestamp>",
  "createdBy":   "<uid>",
  "updatedBy":   "<uid>"
}
```
> The client reads this doc once at startup, caches the lists in memory, and uses them to render `<select>` options. Rules: readable by any authenticated user; writable only by `super_admin`.

#### 4.8.2 `/settings/ui_schemas`
```jsonc
{
  "assetForm": {
    "sections": [
      { "key": "identity",  "fields": ["sku","name","description","category","brand","model","serialNumber","barcode","tags"] },
      { "key": "location",  "fields": ["branchId","departmentId","holderType","holderId"] },
      { "key": "financial", "fields": ["purchasePrice","currency","purchaseDate","supplier","invoiceNumber"] },
      { "key": "warranty",  "fields": ["warrantyProvider","warrantyStart","warrantyEnd"] },
      { "key": "lifecycle", "fields": ["status","condition","acquiredAt","retiredAt"] }
    ]
  },
  "userForm": {
    "sections": [
      { "key": "identity",     "fields": ["email","displayName","phone","photoUrl"] },
      { "key": "organization", "fields": ["branchId","departmentId","jobTitle"] },
      { "key": "system",       "fields": ["system.role","system.status"] }
    ]
  },
  // … licenseForm, transferForm similarly
  "createdAt":  "<Timestamp>",
  "updatedAt":  "<Timestamp>",
  "createdBy":  "<uid>",
  "updatedBy":  "<uid>"
}
```
> Used by `EntityManager` to drive form layout without code changes. Rules: readable by any authenticated user; writable only by `super_admin`.

---

## 5. Required Composite Indexes (create in Firebase Console or via `firestore.indexes.json` later)

| Collection | Fields | Mode |
|---|---|---|
| `assets` | `branchId` ASC, `status` ASC, `updatedAt` DESC | composite |
| `assets` | `holderType` ASC, `holderId` ASC, `status` ASC | composite |
| `assets` | `category` ASC, `branchId` ASC, `updatedAt` DESC | composite |
| `transfers` | `status` ASC, `updatedAt` DESC | composite |
| `transfers` | `to.id` ASC, `status` ASC | composite |
| `transfers` | `from.id` ASC, `status` ASC | composite |
| `users` | `branchId` ASC, `system.role` ASC | composite |
| `licenses` | `status` ASC, `expiresAt` ASC | composite |

> Firestore will surface the exact index URL in dev-console errors the first time a query needs one; creating them up-front is optional.

---

## 6. Role → Collection Permission Matrix (summary)

| Collection | `user` | `admin` | `super_admin` |
|---|---|---|---|
| `users` (self doc) | read self; update `displayName`/`phone`/`photoUrl` | full CRUD except cannot create/edit `super_admin` | full CRUD |
| `users` (other docs) | read only (for holder display names) | same as above | full CRUD |
| `branches` | read | CRUD | CRUD |
| `departments` | read | CRUD | CRUD |
| `assets` | read | CRUD | CRUD |
| `assets/{id}/history` | read (only for assets they hold or for display) | read/append | read/append |
| `licenses` | read, but `key` field is redacted unless they're in `assignments.userIds` | CRUD | CRUD |
| `transfers` | read own (where `from.id == uid` OR `to.id == uid`); create when `from.id == uid && from.type == 'user'`; confirm/reject own incoming; cancel own outgoing while `pending` | CRUD | CRUD |
| `settings/global_lists` | read | read | CRUD |
| `settings/ui_schemas` | read | read | CRUD |

The file `firestore.rules` in the repo root is the canonical enforcement of this matrix. The matrix here is informational.

---

## 7. v2 Backlog (schema items deliberately deferred)

- **Branch-scoped roles.** Add `system.scope: 'global' | 'branch'` and `system.scopeBranchIds: string[]` to `users`. Update rules so an `admin` with `scope == 'branch'` can only write docs whose `branchId ∈ scopeBranchIds`.
- **Accessories.** `/accessoryStock/{itemId}` (consumables with quantity) + `/accessoryLogs/{logId}` (issue / return / adjust). Adds `"accessories"` back to `global_lists.categories` if they're modeled as assets instead.
- **Storage-backed signatures and asset photos.** Firebase Storage buckets `transfers/{id}/signature.png`, `assets/{id}/photos/*`. Requires matching Storage rules file.
- **Notifications** (`/notifications/{id}`) — depends on chosen delivery channel.
- **Suppliers** normalization: `/suppliers/{id}` collection, FK from `assets.supplierId`.
- **Cached dashboard stats** (`/dashboard_stats/{windowId}`) — scheduled Cloud Function writes aggregated counts.
- **Cross-entity activity log** (`/activity_logs/{logId}`) — append-only union audit trail for things not tied to a single asset.

---

## 8. Change Log

- **2026-04-20** — Initial draft written by orchestrator after user confirmed roles (3), no images, manual Console seeding. Applied all review fixes from the earlier critique (split license assignments, flat + mirrored asset holder, removed accessories from MVP, removed `imageUrls`, transfers PIN instead of signature URL, deferred dashboard_stats).
