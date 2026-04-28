// scripts/migrate-asset-kind.mjs
//
// Backfills `kind` and `needsReview` onto every existing /assets/* doc that
// does not yet have them. Mapping rules (see docs/superpowers/plans/2026-04-27-asset-kind-taxonomy.md):
//
//   - If the doc already has `kind` ∈ {device, furniture, accessory, other} → skip.
//   - Else if `category` is in LEGACY_CATEGORY_TO_KIND → use that mapping.
//   - Else if `name` keyword-matches via inferKind() → use that.
//   - Else → kind='other', needsReview=true (so super_admin can re-classify).
//
//   `vehicle` always maps to kind='other' AND sets needsReview=true.
//
// Modes:
//   --dry-run  (default) Print what would change, do not write.
//   --commit   Write the patch via batched updates.
//
// Run with:
//   node scripts/migrate-asset-kind.mjs            # dry run
//   node scripts/migrate-asset-kind.mjs --commit   # apply

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import admin from "firebase-admin";

// We can't import the ESM/CJS hybrid src/ modules straight from a Node script
// without bundling, so we re-declare the small constants we need locally.
// Keep these in sync with src/domain/categories.js.
const ASSET_KINDS = ["device", "furniture", "accessory", "other"];

const LEGACY_CATEGORY_TO_KIND = {
  laptop: "device",
  desktop: "device",
  monitor: "device",
  phone: "device",
  tablet: "device",
  peripheral: "accessory",
  furniture: "furniture",
  vehicle: "other", // flagged needsReview below
  other: "other",
};

// Lightweight keyword-based name classifier mirrors src/domain/categories.js.
// We only need the high-confidence keywords here; ambiguous names land on
// kind='other' + needsReview=true, which is the safe default.
const NAME_KEYWORDS = {
  // device
  laptop: "device", notebook: "device", macbook: "device",
  ноутбук: "device", ноут: "device",
  computer: "device", desktop: "device", pc: "device",
  компьютер: "device", пк: "device",
  monitor: "device", screen: "device", display: "device",
  монитор: "device", дисплей: "device",
  phone: "device", iphone: "device", smartphone: "device",
  телефон: "device", смартфон: "device",
  tablet: "device", ipad: "device", планшет: "device",
  printer: "device", принтер: "device",
  scanner: "device", сканер: "device",
  router: "device", роутер: "device",
  projector: "device", проектор: "device",
  switch: "device", ups: "device", nas: "device",
  // accessory
  keyboard: "accessory", клавиатура: "accessory",
  mouse: "accessory", мышь: "accessory", мышка: "accessory",
  headphones: "accessory", headset: "accessory",
  наушники: "accessory", гарнитура: "accessory",
  webcam: "accessory", вебкамера: "accessory",
  charger: "accessory", зарядка: "accessory", зарядное: "accessory",
  cable: "accessory", кабель: "accessory",
  hub: "accessory", хаб: "accessory",
  mousepad: "accessory", коврик: "accessory",
  flash: "accessory", флешка: "accessory",
  microphone: "accessory", микрофон: "accessory",
  adapter: "accessory", адаптер: "accessory",
  // furniture
  table: "furniture", desk: "furniture", chair: "furniture",
  sofa: "furniture", couch: "furniture", cabinet: "furniture",
  wardrobe: "furniture", shelf: "furniture", bookcase: "furniture",
  fridge: "furniture", microwave: "furniture", kettle: "furniture",
  стол: "furniture", стул: "furniture", кресло: "furniture",
  диван: "furniture", шкаф: "furniture", полка: "furniture",
  тумба: "furniture", холодильник: "furniture", чайник: "furniture",
};

function inferKindFromName(name) {
  if (!name || typeof name !== "string") return null;
  const lower = name.toLowerCase();
  for (const token of lower.split(/[\s,/.;:()-]+/).filter(Boolean)) {
    if (NAME_KEYWORDS[token]) return NAME_KEYWORDS[token];
  }
  for (const [keyword, kind] of Object.entries(NAME_KEYWORDS)) {
    if (lower.includes(keyword)) return kind;
  }
  return null;
}

// --- init ---------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SA_PATH = resolve(REPO_ROOT, "firebase-service-account.json");

const args = new Set(process.argv.slice(2));
const COMMIT = args.has("--commit");

const saJson = JSON.parse(await readFile(SA_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(saJson) });
const db = admin.firestore();

// --- run ----------------------------------------------------------------

console.log(
  `[migrate-asset-kind] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} — scanning /assets…`,
);

const snap = await db.collection("assets").get();
console.log(`[migrate-asset-kind] /assets contains ${snap.size} doc(s).`);

let skippedAlreadyMigrated = 0;
let plannedFromCategory = 0;
let plannedFromName = 0;
let plannedFallbackOther = 0;
let plannedNeedsReview = 0;

const batchOps = [];

for (const doc of snap.docs) {
  const data = doc.data() || {};
  if (data.kind && ASSET_KINDS.includes(data.kind)) {
    skippedAlreadyMigrated += 1;
    continue;
  }

  let kind = null;
  let source = "fallback";
  let needsReview = false;

  if (data.category && LEGACY_CATEGORY_TO_KIND[data.category]) {
    kind = LEGACY_CATEGORY_TO_KIND[data.category];
    source = `category=${data.category}`;
    if (data.category === "vehicle") needsReview = true;
  } else {
    const guessed = inferKindFromName(data.name);
    if (guessed) {
      kind = guessed;
      source = `name="${data.name}"`;
      plannedFromName += 1;
    }
  }

  if (!kind) {
    kind = "other";
    needsReview = true;
    plannedFallbackOther += 1;
  } else if (source.startsWith("category=")) {
    plannedFromCategory += 1;
  }

  if (needsReview) plannedNeedsReview += 1;

  console.log(
    `  ${doc.id.padEnd(22)} kind=${kind.padEnd(9)} needsReview=${needsReview ? "Y" : "n"} via ${source}`,
  );

  batchOps.push({ ref: doc.ref, patch: { kind, needsReview } });
}

console.log("");
console.log("[migrate-asset-kind] Summary:");
console.log(`  already migrated:     ${skippedAlreadyMigrated}`);
console.log(`  planned (from category): ${plannedFromCategory}`);
console.log(`  planned (from name):     ${plannedFromName}`);
console.log(`  planned (fallback other): ${plannedFallbackOther}`);
console.log(`  planned needsReview=true: ${plannedNeedsReview}`);
console.log(`  total to write:       ${batchOps.length}`);

if (!COMMIT) {
  console.log("");
  console.log("[migrate-asset-kind] DRY-RUN — no writes performed. Re-run with --commit to apply.");
  process.exit(0);
}

// Firestore batches cap at 500 ops; chunk if needed.
const CHUNK = 400;
let written = 0;
for (let i = 0; i < batchOps.length; i += CHUNK) {
  const slice = batchOps.slice(i, i + CHUNK);
  const batch = db.batch();
  for (const op of slice) batch.update(op.ref, op.patch);
  await batch.commit();
  written += slice.length;
  console.log(`[migrate-asset-kind] Committed ${written}/${batchOps.length}.`);
}

console.log(`[migrate-asset-kind] DONE — wrote ${written} update(s).`);
