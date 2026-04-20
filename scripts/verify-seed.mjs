// scripts/verify-seed.mjs
//
// Reads back the 6 key seeded documents and logs EXISTS/MISSING plus key fields.
// Assets collection: checks non-empty AND at least one doc with holderId == UID.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SA_PATH = resolve(REPO_ROOT, "firebase-service-account.json");

const UID = "L20k6jARteVparZeKI2plsM5r2n2";

const saJson = JSON.parse(await readFile(SA_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(saJson) });
const db = admin.firestore();

function mark(ok, label, extra = "") {
  const tag = ok ? "EXISTS " : "MISSING";
  console.log(`${tag} ${label}${extra ? "  " + extra : ""}`);
  return ok;
}

async function checkDoc(path, keyFieldsFn) {
  const ref = db.doc(path);
  const snap = await ref.get();
  if (!snap.exists) return mark(false, path);
  const data = snap.data();
  return mark(true, path, keyFieldsFn(data));
}

async function checkAssets() {
  const col = db.collection("assets");
  const probe = await col.limit(1).get();
  if (probe.empty) {
    console.log("MISSING assets  (collection empty)");
    return false;
  }
  const ownedSnap = await col.where("holderId", "==", UID).limit(1).get();
  if (ownedSnap.empty) {
    console.log(`EXISTS  assets  (but NONE with holderId==${UID})`);
    return false;
  }
  const doc = ownedSnap.docs[0];
  const d = doc.data();
  console.log(
    `EXISTS  assets  id=${doc.id}  sku=${d.sku}  name=${JSON.stringify(
      d.name
    )}  holderId=${d.holderId}  status=${d.status}`
  );
  return true;
}

const results = [];

results.push(
  await checkDoc(
    "settings/global_lists",
    (d) =>
      `userRoles=${JSON.stringify(d.userRoles)}  currencies=${JSON.stringify(
        d.currencies
      )}`
  )
);

results.push(
  await checkDoc(
    `users/${UID}`,
    (d) =>
      `email=${d.email}  displayName=${d.displayName}  role=${d.system?.role}  status=${d.system?.status}`
  )
);

results.push(
  await checkDoc(
    "branches/br_HQ",
    (d) => `name=${JSON.stringify(d.name)}  code=${d.code}  status=${d.status}`
  )
);

results.push(
  await checkDoc(
    "departments/dp_it",
    (d) =>
      `name=${d.name}  branchId=${d.branchId}  managerUid=${d.managerUid}  status=${d.status}`
  )
);

results.push(await checkAssets());

results.push(
  await checkDoc("settings/ui_schemas", (d) => {
    const names = Object.keys(d).filter((k) => k.endsWith("Form"));
    const assetSections = d.assetForm?.sections?.map((s) => s.key).join(",");
    return `forms=[${names.join(",")}]  assetForm.sections=[${assetSections}]`;
  })
);

const allOk = results.every(Boolean);
console.log("---");
console.log(allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED");
process.exit(allOk ? 0 : 1);
