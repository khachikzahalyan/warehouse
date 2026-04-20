# Firestore Seed Templates — Manual Console Creation (MVP)

> **Companion to:** `firestore-schema-v1.md`. Use this document when creating collections **by hand** in the Firebase Console at `https://console.firebase.google.com/project/warehouse-8ec61/firestore`.
>
> **Order of creation matters.** Follow the numbered sequence in §2 — `settings/global_lists` first, then `users/{your-uid}` (to have a super_admin), then the org skeleton (`branches`, `departments`), then sample `assets`, `licenses`, `transfers`, and finally `settings/ui_schemas`.

---

## 1. Console UX cheatsheet (the parts that trip people up)

The Firebase Console's "Add document" form does NOT accept raw JSON for a whole document — you add **fields one at a time** and pick a **type** per field. Below is how to translate the JSON in this doc into Console clicks.

| JSON literal in templates | Console field type | How to enter it |
|---|---|---|
| `"hello"` | **string** | paste the text |
| `42`, `3.14` | **number** | paste the number |
| `true` / `false` | **boolean** | toggle |
| `null` | **null** | pick "null" in the type dropdown — no value needed |
| `"<Timestamp>"` or any ISO datetime string | **timestamp** | click the datetime picker; paste ISO-8601 or pick now |
| `[ "a", "b" ]` | **array** | click "add item" for each entry; each item has its own type |
| `{ "x": 1 }` | **map** | click "add field" inside the map; each key has its own type |
| `"<uid>"` placeholder | **string** | replace with the real Firebase Auth uid (copy from Auth → Users in Console) |

**Important notes:**
- Firestore does NOT have a `reference` type in our templates (we store FKs as strings — see schema §3.3). Do not use the "reference" type in the Console.
- `createdAt` / `updatedAt` are **timestamp** fields. In the Console, set them to "now" or to an ISO date. Once the real app writes, `serverTimestamp()` will overwrite them.
- For the `users` collection, you MUST set the **document id** equal to the Firebase Auth uid. In the Console, click "Add document" → "Document ID" → toggle off "auto-id" → paste the uid.
- For `branches`/`departments`/`settings`, the doc id is fixed (see the templates). Same toggle-off-auto-id technique.

---

## 2. Seeding order

1. **`/settings/global_lists`** — needed so any form that references categories/currencies/roles renders.
2. **Firebase Auth → create your super_admin user.** Sign up (or use "Add user" in Console) with your email. Copy the uid.
3. **`/users/{your-uid}`** — create YOUR profile doc with `system.role = "super_admin"`.
4. **`/branches/br_HQ`** — one branch to anchor everything.
5. **`/departments/dp_it`** — one department inside that branch.
6. **`/assets/<auto-id>`** — one sample asset.
7. **`/licenses/<auto-id>`** — one sample license (optional for MVP smoke).
8. **`/transfers/<auto-id>`** — leave empty for now; created by the app when you implement the transfer UI.
9. **`/settings/ui_schemas`** — last, because it references field names from `assets` / `users` you've just confirmed exist.

---

## 3. Templates

### 3.1 `settings/global_lists`

- Collection: **`settings`**
- Document id: **`global_lists`** (manual, not auto)

```jsonc
{
  "categories":        ["laptop","desktop","monitor","peripheral","phone","tablet","furniture","vehicle","other"],
  "currencies":        ["USD","EUR","AMD","RUB"],
  "conditions":        ["new","good","fair","broken"],
  "assetStatuses":     ["active","archived"],
  "transferStatuses":  ["pending","confirmed","rejected","cancelled"],
  "licenseTypes":      ["perpetual","subscription","oem","volume"],
  "userRoles":         ["user","admin","super_admin"],
  "createdAt":         "2026-04-20T12:00:00Z",  // timestamp
  "updatedAt":         "2026-04-20T12:00:00Z",  // timestamp
  "createdBy":         "<your-uid>",
  "updatedBy":         "<your-uid>"
}
```

Console steps:
1. Firestore → "Start collection" → id `settings`.
2. First document → id `global_lists` (toggle off auto-id).
3. Add each field from the JSON above. For `categories` etc., pick type **array** and add string items one by one.
4. For `createdAt`/`updatedAt`, pick type **timestamp** and paste the ISO date.

---

### 3.2 `users/{your-uid}` — the first super_admin

- Collection: **`users`** (create via "Start collection" if it doesn't exist yet)
- Document id: **your Firebase Auth uid** (copy from Authentication → Users → click row → copy uid)

```jsonc
{
  "email":        "khach@example.com",            // replace with your email
  "displayName":  "Khach",
  "phone":        null,                           // type: null
  "photoUrl":     null,                           // type: null

  "branchId":     "br_HQ",
  "departmentId": "dp_it",
  "jobTitle":     "Owner",

  "system": {                                     // type: map
    "role":        "super_admin",                 // REQUIRED — this is what unlocks everything
    "status":      "active",
    "lastLoginAt": null                           // type: null
  },

  "createdAt":    "2026-04-20T12:00:00Z",         // timestamp
  "updatedAt":    "2026-04-20T12:00:00Z",         // timestamp
  "createdBy":    "<your-uid>",                   // self-created
  "updatedBy":    "<your-uid>"
}
```

> **Chicken-and-egg note:** when rules are deployed, only `super_admin` can write to another user's `system.role`. But THIS first doc is the one that makes you super_admin in the first place. Create it BEFORE deploying the hardened rules (or temporarily relax rules to "allow write: if request.auth != null;" while seeding, then redeploy the real rules). The `firestore.rules` file in the repo is a draft and is NOT deployed yet, so this is safe during the manual seeding phase.

---

### 3.3 `branches/br_HQ`

- Collection: **`branches`**
- Document id: **`br_HQ`** (manual)

```jsonc
{
  "id":        "br_HQ",
  "name":      "Yerevan HQ",
  "code":      "YER",
  "address":   "1 Mashtots Ave, Yerevan",
  "timezone":  "Asia/Yerevan",
  "status":    "active",
  "createdAt": "2026-04-20T12:00:00Z",
  "updatedAt": "2026-04-20T12:00:00Z",
  "createdBy": "<your-uid>",
  "updatedBy": "<your-uid>"
}
```

Optionally add a second branch for testing multi-branch scenarios later:

```jsonc
// doc id: br_gyumri
{
  "id":        "br_gyumri",
  "name":      "Gyumri Warehouse",
  "code":      "GYU",
  "address":   "Main St, Gyumri",
  "timezone":  "Asia/Yerevan",
  "status":    "active",
  "createdAt": "2026-04-20T12:00:00Z",
  "updatedAt": "2026-04-20T12:00:00Z",
  "createdBy": "<your-uid>",
  "updatedBy": "<your-uid>"
}
```

---

### 3.4 `departments/dp_it`

- Collection: **`departments`**
- Document id: **`dp_it`**

```jsonc
{
  "id":         "dp_it",
  "name":       "IT",
  "branchId":   "br_HQ",
  "managerUid": "<your-uid>",
  "status":     "active",
  "createdAt":  "2026-04-20T12:00:00Z",
  "updatedAt":  "2026-04-20T12:00:00Z",
  "createdBy":  "<your-uid>",
  "updatedBy":  "<your-uid>"
}
```

Second department (optional):

```jsonc
// doc id: dp_ops
{
  "id":         "dp_ops",
  "name":       "Operations",
  "branchId":   "br_HQ",
  "managerUid": null,
  "status":     "active",
  "createdAt":  "2026-04-20T12:00:00Z",
  "updatedAt":  "2026-04-20T12:00:00Z",
  "createdBy":  "<your-uid>",
  "updatedBy":  "<your-uid>"
}
```

---

### 3.5 `assets/<auto-id>` — sample

- Collection: **`assets`**
- Document id: **auto-id** (leave toggle on)

```jsonc
{
  "sku":          "LAP-00001",
  "name":         "MacBook Pro 16\" M3 Max",
  "description":  "Space Black, 64 GB / 2 TB",
  "category":     "laptop",
  "brand":        "Apple",
  "model":        "MacBook Pro 16 M3 Max 2024",
  "serialNumber": "C02XXXXXXXXX",
  "barcode":      null,
  "tags":         ["m3","16in"],                  // array of strings

  "branchId":     "br_HQ",
  "departmentId": "dp_it",
  "holderType":   "user",
  "holderId":     "<your-uid>",
  "holder": {                                     // map
    "type":        "user",
    "id":          "<your-uid>",
    "displayName": "Khach"
  },

  "purchasePrice":    2499.00,
  "currency":         "USD",
  "purchaseDate":     "2024-10-01T00:00:00Z",     // timestamp
  "supplier":         "Apple Armenia",
  "invoiceNumber":    "INV-2024-001",

  "warrantyProvider": "AppleCare+",
  "warrantyStart":    "2024-10-01T00:00:00Z",
  "warrantyEnd":      "2027-10-01T00:00:00Z",

  "status":      "active",
  "condition":   "new",
  "acquiredAt":  "2024-10-01T00:00:00Z",
  "retiredAt":   null,

  "createdAt":   "2026-04-20T12:00:00Z",
  "updatedAt":   "2026-04-20T12:00:00Z",
  "createdBy":   "<your-uid>",
  "updatedBy":   "<your-uid>"
}
```

> **Do NOT** create an `assets/{id}/history` subcollection by hand in the Console for this seed. The first real history entry will be written by the app when it performs its first update / transfer.

---

### 3.6 `licenses/<auto-id>` — sample (optional)

- Collection: **`licenses`**
- Document id: **auto-id**

```jsonc
{
  "name":         "Microsoft 365 Business Premium",
  "vendor":       "Microsoft",
  "key":          "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",  // string; sensitive
  "type":         "subscription",
  "seatsTotal":   25,
  "seatsUsed":    1,
  "purchaseDate": "2026-01-15T00:00:00Z",
  "expiresAt":    "2027-01-15T00:00:00Z",
  "cost":         1250.00,
  "currency":     "USD",

  "assignments": {                                  // map
    "assetIds": [],                                 // array of strings
    "userIds":  ["<your-uid>"]                      // array of strings — seed with yourself
  },

  "status":     "active",
  "notes":      "Renews annually on 2027-01-15",

  "createdAt":  "2026-04-20T12:00:00Z",
  "updatedAt":  "2026-04-20T12:00:00Z",
  "createdBy":  "<your-uid>",
  "updatedBy":  "<your-uid>"
}
```

---

### 3.7 `transfers` — do not seed by hand

Leave this collection empty in MVP seeding. The app will create the first `transfers/{id}` document when you exercise the transfer flow in the UI (Iteration 2+). Creating one by hand is possible but pointless — the state-machine / PIN / batch-update logic lives in the app, and a hand-made doc won't trigger it.

---

### 3.8 `settings/ui_schemas`

- Collection: **`settings`** (already exists from §3.1)
- Document id: **`ui_schemas`** (manual)

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
  "licenseForm": {
    "sections": [
      { "key": "identity",  "fields": ["name","vendor","key","type"] },
      { "key": "seats",     "fields": ["seatsTotal","seatsUsed","assignments.assetIds","assignments.userIds"] },
      { "key": "lifecycle", "fields": ["purchaseDate","expiresAt","cost","currency","status","notes"] }
    ]
  },
  "transferForm": {
    "sections": [
      { "key": "scope",  "fields": ["assetIds"] },
      { "key": "from",   "fields": ["from.type","from.id"] },
      { "key": "to",     "fields": ["to.type","to.id"] },
      { "key": "reason", "fields": ["reason","notes"] }
    ]
  },

  "createdAt":  "2026-04-20T12:00:00Z",
  "updatedAt":  "2026-04-20T12:00:00Z",
  "createdBy":  "<your-uid>",
  "updatedBy":  "<your-uid>"
}
```

The `sections` arrays are maps-in-arrays, which the Console supports: pick **array**, then for each item pick type **map**, then inside each map add `key` (string) and `fields` (array of strings).

---

## 4. Verification after seeding

After you've created the docs above, verify:

1. Firestore → `settings/global_lists` exists and contains `userRoles: ["user","admin","super_admin"]`.
2. Firestore → `users/{your-uid}` exists, `system.role == "super_admin"`, `system.status == "active"`.
3. Firestore → `branches/br_HQ` exists.
4. Firestore → `departments/dp_it` exists, `branchId == "br_HQ"`.
5. Firestore → `assets` has at least one doc, `holderId == your-uid`, `holder.id == your-uid`.
6. Firestore → `settings/ui_schemas` exists.

When all six boxes are checked, tell the orchestrator "коллекции созданы" so it can proceed to deploying `firestore.rules` and wiring the React app.
