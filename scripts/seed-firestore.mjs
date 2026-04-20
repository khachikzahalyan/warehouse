// scripts/seed-firestore.mjs
//
// Seeds the initial Firestore documents for the Warehouse Management System.
// Source of truth for values: docs/superpowers/plans/firestore-seed-templates.md
//
// Run with: npm run seed
//
// Idempotency:
//   - Fixed-id docs: read first; if they exist, SKIP.
//   - Auto-id collections (assets): add only if collection is empty.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SA_PATH = resolve(REPO_ROOT, "firebase-service-account.json");

// --- constants -------------------------------------------------------------

const UID = "L20k6jARteVparZeKI2plsM5r2n2";
const EMAIL = "zahalyanxcho@gmail.com";
const DISPLAY_NAME = "Khach";

// --- init ------------------------------------------------------------------

const saJson = JSON.parse(await readFile(SA_PATH, "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(saJson),
});

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const ts = () => FieldValue.serverTimestamp();
const tsFromIso = (iso) => Timestamp.fromDate(new Date(iso));

// --- helpers ---------------------------------------------------------------

async function seedDoc(ref, buildData, label) {
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`SKIP   ${label} (exists: ${ref.path})`);
    return;
  }
  await ref.set(buildData());
  console.log(`CREATE ${label} (${ref.path})`);
}

async function seedIfEmpty(collectionRef, buildData, label) {
  const probe = await collectionRef.limit(1).get();
  if (!probe.empty) {
    console.log(`SKIP   ${label} (collection not empty: ${collectionRef.path})`);
    return;
  }
  const data = buildData();
  const docRef = await collectionRef.add(data);
  console.log(`CREATE ${label} (${collectionRef.path}/${docRef.id})`);
}

// --- main ------------------------------------------------------------------

async function main() {
  console.log(`Seeding project: ${saJson.project_id}`);
  console.log(`Owner uid:       ${UID}`);
  console.log("---");

  // 1. settings/global_lists
  await seedDoc(
    db.collection("settings").doc("global_lists"),
    () => ({
      categories: [
        "laptop",
        "desktop",
        "monitor",
        "peripheral",
        "phone",
        "tablet",
        "furniture",
        "vehicle",
        "other",
      ],
      currencies: ["USD", "EUR", "AMD", "RUB"],
      conditions: ["new", "good", "fair", "broken"],
      assetStatuses: ["active", "archived"],
      transferStatuses: ["pending", "confirmed", "rejected", "cancelled"],
      licenseTypes: ["perpetual", "subscription", "oem", "volume"],
      userRoles: ["user", "admin", "super_admin"],
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: UID,
      updatedBy: UID,
    }),
    "settings/global_lists"
  );

  // 2. users/{UID}
  await seedDoc(
    db.collection("users").doc(UID),
    () => ({
      email: EMAIL,
      displayName: DISPLAY_NAME,
      phone: null,
      photoUrl: null,
      branchId: "br_HQ",
      departmentId: "dp_it",
      jobTitle: "Owner",
      system: {
        role: "super_admin",
        status: "active",
        lastLoginAt: null,
      },
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: UID,
      updatedBy: UID,
    }),
    `users/${UID}`
  );

  // 3. branches/br_HQ
  await seedDoc(
    db.collection("branches").doc("br_HQ"),
    () => ({
      id: "br_HQ",
      name: "Yerevan HQ",
      code: "YER",
      address: "1 Mashtots Ave, Yerevan",
      timezone: "Asia/Yerevan",
      status: "active",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: UID,
      updatedBy: UID,
    }),
    "branches/br_HQ"
  );

  // 4. departments/dp_it
  await seedDoc(
    db.collection("departments").doc("dp_it"),
    () => ({
      id: "dp_it",
      name: "IT",
      branchId: "br_HQ",
      managerUid: UID,
      status: "active",
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: UID,
      updatedBy: UID,
    }),
    "departments/dp_it"
  );

  // 5. assets (auto-id, only if collection empty)
  await seedIfEmpty(
    db.collection("assets"),
    () => ({
      sku: "LAP-00001",
      name: 'MacBook Pro 16" M3 Max',
      description: "Space Black, 64 GB / 2 TB",
      category: "laptop",
      brand: "Apple",
      model: "MacBook Pro 16 M3 Max 2024",
      serialNumber: "C02XXXXXXXXX",
      barcode: null,
      tags: ["m3", "16in"],

      branchId: "br_HQ",
      departmentId: "dp_it",
      holderType: "user",
      holderId: UID,
      holder: {
        type: "user",
        id: UID,
        displayName: DISPLAY_NAME,
      },

      purchasePrice: 2499.0,
      currency: "USD",
      purchaseDate: tsFromIso("2024-10-01T00:00:00Z"),
      supplier: "Apple Armenia",
      invoiceNumber: "INV-2024-001",

      warrantyProvider: "AppleCare+",
      warrantyStart: tsFromIso("2024-10-01T00:00:00Z"),
      warrantyEnd: tsFromIso("2027-10-01T00:00:00Z"),

      status: "active",
      condition: "new",
      acquiredAt: tsFromIso("2024-10-01T00:00:00Z"),
      retiredAt: null,

      createdAt: ts(),
      updatedAt: ts(),
      createdBy: UID,
      updatedBy: UID,
    }),
    "assets/<auto-id>"
  );

  // 6. settings/ui_schemas — values from firestore-seed-templates.md §3.8
  await seedDoc(
    db.collection("settings").doc("ui_schemas"),
    () => ({
      assetForm: {
        sections: [
          {
            key: "identity",
            fields: [
              "sku",
              "name",
              "description",
              "category",
              "brand",
              "model",
              "serialNumber",
              "barcode",
              "tags",
            ],
          },
          {
            key: "location",
            fields: ["branchId", "departmentId", "holderType", "holderId"],
          },
          {
            key: "financial",
            fields: [
              "purchasePrice",
              "currency",
              "purchaseDate",
              "supplier",
              "invoiceNumber",
            ],
          },
          {
            key: "warranty",
            fields: ["warrantyProvider", "warrantyStart", "warrantyEnd"],
          },
          {
            key: "lifecycle",
            fields: ["status", "condition", "acquiredAt", "retiredAt"],
          },
        ],
      },
      userForm: {
        sections: [
          {
            key: "identity",
            fields: ["email", "displayName", "phone", "photoUrl"],
          },
          {
            key: "organization",
            fields: ["branchId", "departmentId", "jobTitle"],
          },
          {
            key: "system",
            fields: ["system.role", "system.status"],
          },
        ],
      },
      licenseForm: {
        sections: [
          {
            key: "identity",
            fields: ["name", "vendor", "key", "type"],
          },
          {
            key: "seats",
            fields: [
              "seatsTotal",
              "seatsUsed",
              "assignments.assetIds",
              "assignments.userIds",
            ],
          },
          {
            key: "lifecycle",
            fields: [
              "purchaseDate",
              "expiresAt",
              "cost",
              "currency",
              "status",
              "notes",
            ],
          },
        ],
      },
      transferForm: {
        sections: [
          { key: "scope", fields: ["assetIds"] },
          { key: "from", fields: ["from.type", "from.id"] },
          { key: "to", fields: ["to.type", "to.id"] },
          { key: "reason", fields: ["reason", "notes"] },
        ],
      },
      createdAt: ts(),
      updatedAt: ts(),
      createdBy: UID,
      updatedBy: UID,
    }),
    "settings/ui_schemas"
  );

  console.log("---");
  console.log("Done.");
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error("SEED FAILED:", err);
  process.exit(1);
}
