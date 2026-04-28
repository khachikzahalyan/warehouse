// Category groups + kind taxonomy + keyword suggestion helpers.
// Pure (no React/Firebase). Single source of truth for the kind ontology and
// the per-kind type lists. Used by Quick-Add, EditAssetDrawer, WarehousePage
// filter chips, and the migration script.
//
// Kind list split (2026-04-27):
//   - ASSET_KINDS         — kinds offered on CREATE in the UI (3 entries).
//   - LEGACY_ASSET_KINDS  — every kind ever persisted (4 entries, includes
//                           'other' for legacy / migrated rows). Read paths
//                           and validators MUST accept these so existing
//                           docs render without errors. Create paths MUST
//                           NOT offer 'other' — it now only exists as a
//                           "needs review" bucket the super_admin can
//                           reclassify.

// ─── Kind taxonomy ─────────────────────────────────────────────────────────────

/** @typedef {'device' | 'furniture' | 'accessory' | 'other'} AssetKind */

/**
 * Canonical, ordered list of asset kinds OFFERED ON CREATE. Matches the order
 * used in the segmented control and filter chips. The `'other'` value is
 * intentionally absent here — it stays accept-only on read via
 * `LEGACY_ASSET_KINDS`.
 *
 * @type {ReadonlyArray<AssetKind>}
 */
export const ASSET_KINDS = Object.freeze(/** @type {const} */ ([
  'device',
  'furniture',
  'accessory',
]));

/**
 * Every kind value the database may contain. Used by validators and read
 * paths so legacy rows tagged `kind: 'other'` continue to render. Do NOT
 * iterate this in UI lists that offer kinds for CREATE — use ASSET_KINDS.
 *
 * @type {ReadonlyArray<AssetKind>}
 */
export const LEGACY_ASSET_KINDS = Object.freeze(/** @type {const} */ ([
  'device',
  'furniture',
  'accessory',
  'other',
]));

/**
 * Per-kind list of "Type" values (the secondary classification within a
 * kind). The form's Type dropdown is sourced from `TYPES_BY_KIND[kind]`.
 *
 * NOTE: locale labels live in `src/locales/<lang>/warehouse.json` under
 * `types.<id>`. Keep these ids in sync with the locale files.
 *
 * @type {Readonly<Record<AssetKind, ReadonlyArray<string>>>}
 */
export const TYPES_BY_KIND = Object.freeze({
  device: Object.freeze([
    'laptop', 'desktop', 'monitor', 'phone', 'tablet',
    'printer', 'scanner', 'projector', 'router', 'switch',
    'ups', 'smart_tv', 'ip_phone', 'nas', 'dock_station',
    'external_hdd',
  ]),
  furniture: Object.freeze([
    'cabinet', 'desk', 'table', 'conference_table', 'chair',
    'office_chair', 'sofa', 'pedestal', 'bookshelf', 'locker',
    'safe', 'coat_rack', 'whiteboard', 'printer_stand',
    'server_rack', 'fridge', 'microwave', 'kettle',
    'water_cooler', 'ac_unit', 'lamp', 'mirror',
  ]),
  accessory: Object.freeze([
    'mouse', 'keyboard', 'headset', 'webcam', 'charger',
    'cable', 'usb_hub', 'mousepad', 'usb_stick',
    'hdd_dock', 'presenter_remote', 'microphone',
    'card_reader', 'adapter',
  ]),
  other: Object.freeze([
    'other_misc',
  ]),
});

/**
 * Map a legacy `category` value (the flat 9-key enum used before the kind
 * taxonomy) onto a kind. Used by the migration script and by the form when
 * editing a legacy doc that has `category` but no `kind`.
 *
 * `vehicle` deliberately maps to `'other'` — vehicles are out of scope for
 * the new taxonomy. The migration flags such docs `needsReview: true`.
 *
 * @type {Readonly<Record<string, AssetKind>>}
 */
export const LEGACY_CATEGORY_TO_KIND = Object.freeze({
  laptop: 'device',
  desktop: 'device',
  monitor: 'device',
  phone: 'device',
  tablet: 'device',
  peripheral: 'accessory',
  furniture: 'furniture',
  vehicle: 'other',
  other: 'other',
});

// ─── Legacy category-group exports (kept for back-compat) ─────────────────────

export const ALL_CATEGORY_KEYS = [
  'laptop',
  'desktop',
  'monitor',
  'peripheral',
  'phone',
  'tablet',
  'furniture',
  'vehicle',
  'other',
];

export const CATEGORY_GROUPS = {
  electronics: ['laptop', 'desktop', 'monitor', 'phone', 'tablet'],
  accessory: ['peripheral'],
  furniture: ['furniture'],
  vehicle: ['vehicle'],
  other: ['other'],
};

// ─── Keyword dictionary (English + Russian, lowercase, accent-free) ────────────

/** @type {Record<string, 'electronics' | 'accessory' | 'furniture' | 'vehicle'>} */
const KEYWORDS = {
  // electronics (devices)
  laptop: 'electronics',
  notebook: 'electronics',
  macbook: 'electronics',
  ноутбук: 'electronics',
  ноут: 'electronics',
  computer: 'electronics',
  desktop: 'electronics',
  pc: 'electronics',
  компьютер: 'electronics',
  пк: 'electronics',
  monitor: 'electronics',
  screen: 'electronics',
  display: 'electronics',
  монитор: 'electronics',
  дисплей: 'electronics',
  phone: 'electronics',
  iphone: 'electronics',
  smartphone: 'electronics',
  телефон: 'electronics',
  смартфон: 'electronics',
  tablet: 'electronics',
  ipad: 'electronics',
  планшет: 'electronics',
  printer: 'electronics',
  принтер: 'electronics',
  scanner: 'electronics',
  сканер: 'electronics',
  router: 'electronics',
  роутер: 'electronics',
  projector: 'electronics',
  проектор: 'electronics',
  switch: 'electronics',
  ups: 'electronics',
  nas: 'electronics',
  // accessories
  keyboard: 'accessory',
  клавиатура: 'accessory',
  mouse: 'accessory',
  мышь: 'accessory',
  мышка: 'accessory',
  headphones: 'accessory',
  headset: 'accessory',
  наушники: 'accessory',
  гарнитура: 'accessory',
  speaker: 'accessory',
  колонка: 'accessory',
  webcam: 'accessory',
  вебкамера: 'accessory',
  camera: 'accessory',
  камера: 'accessory',
  charger: 'accessory',
  зарядка: 'accessory',
  зарядное: 'accessory',
  cable: 'accessory',
  кабель: 'accessory',
  hub: 'accessory',
  хаб: 'accessory',
  mousepad: 'accessory',
  коврик: 'accessory',
  flash: 'accessory',
  флешка: 'accessory',
  microphone: 'accessory',
  микрофон: 'accessory',
  adapter: 'accessory',
  адаптер: 'accessory',
  device: 'electronics',
  devices: 'electronics',
  устройство: 'electronics',
  accessory: 'accessory',
  accessories: 'accessory',
  аксессуар: 'accessory',
  аксессуары: 'accessory',
  аксесуар: 'accessory',
  аксесуары: 'accessory',
  // furniture
  table: 'furniture',
  desk: 'furniture',
  chair: 'furniture',
  sofa: 'furniture',
  couch: 'furniture',
  cabinet: 'furniture',
  wardrobe: 'furniture',
  shelf: 'furniture',
  bookcase: 'furniture',
  fridge: 'furniture',
  microwave: 'furniture',
  kettle: 'furniture',
  стол: 'furniture',
  стул: 'furniture',
  кресло: 'furniture',
  диван: 'furniture',
  шкаф: 'furniture',
  полка: 'furniture',
  тумба: 'furniture',
  холодильник: 'furniture',
  чайник: 'furniture',
  // vehicle (legacy)
  car: 'vehicle',
  auto: 'vehicle',
  truck: 'vehicle',
  motorcycle: 'vehicle',
  bicycle: 'vehicle',
  bike: 'vehicle',
  машина: 'vehicle',
  авто: 'vehicle',
  грузовик: 'vehicle',
  мотоцикл: 'vehicle',
  велосипед: 'vehicle',
};

// ─── Kind helpers ──────────────────────────────────────────────────────────────

/**
 * Map a legacy category-group label onto a kind.
 *
 * @param {'electronics' | 'accessory' | 'furniture' | 'vehicle' | 'other' | null | undefined} group
 * @returns {AssetKind | null}
 */
function groupToKind(group) {
  if (!group) return null;
  if (group === 'electronics') return 'device';
  if (group === 'accessory') return 'accessory';
  if (group === 'furniture') return 'furniture';
  if (group === 'vehicle') return 'other';
  if (group === 'other') return 'other';
  return null;
}

/**
 * Detect the most likely kind from a free-form name.
 *
 * Returns null when the name is empty or no keyword matches; the caller can
 * use that to leave the segmented control un-pre-selected.
 *
 * @param {string} name
 * @returns {AssetKind | null}
 */
export function suggestKind(name) {
  return groupToKind(suggestCategoryGroup(name));
}

/**
 * Wrapper around `suggestKind` that also reports confidence: `confident:
 * true` when a keyword matched, `false` when we fell back. Callers that want
 * to mark `needsReview: true` for low-confidence inferences use this.
 *
 * @param {string} name
 * @returns {{ kind: AssetKind, confident: boolean }}
 */
export function inferKind(name) {
  const kind = suggestKind(name);
  if (kind) return { kind, confident: true };
  return { kind: 'other', confident: false };
}

/**
 * Map a legacy `category` value to a kind. When `category` is missing or
 * unknown, returns null so the caller can fall back to `inferKind(name)`.
 *
 * @param {string | null | undefined} category
 * @returns {AssetKind | null}
 */
export function kindFromCategory(category) {
  if (!category) return null;
  const k = LEGACY_CATEGORY_TO_KIND[category];
  if (k) return k;
  // Categories that already match a per-kind type id are first-class —
  // recognise them too. This makes the helper future-proof: as new types
  // are added to TYPES_BY_KIND they automatically map to their kind.
  // Iterate the legacy list so type ids that live under 'other' (e.g.
  // `other_misc`) still resolve for read paths.
  for (const kind of LEGACY_ASSET_KINDS) {
    if (TYPES_BY_KIND[kind].includes(category)) return kind;
  }
  return null;
}

// ─── Legacy category-group helpers ─────────────────────────────────────────────

/**
 * Detect the most likely category group from a free-form name.
 *
 * @param {string} name
 * @returns {'electronics' | 'accessory' | 'furniture' | 'vehicle' | 'other' | null}
 */
export function suggestCategoryGroup(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  // Word-level match first.
  for (const token of lower.split(/[\s,/.;:()-]+/).filter(Boolean)) {
    if (KEYWORDS[token]) return KEYWORDS[token];
  }
  // Then substring fallback (catches "ноутбук" inside "ноутбук-сумка").
  for (const [keyword, group] of Object.entries(KEYWORDS)) {
    if (lower.includes(keyword)) return group;
  }
  return null;
}

/**
 * Filter a {id,label}[] category list down to those matching the suggested
 * group. Returns the original list when no group is suggested (empty name).
 *
 * Kept for legacy QuickAdd Type narrowing — the new taxonomy uses
 * `filterTypesByKind` instead.
 *
 * @template T
 * @param {string} name
 * @param {Array<{ id: string } & T>} categories
 * @returns {Array<{ id: string } & T>}
 */
export function filterCategoriesByName(name, categories) {
  const group = suggestCategoryGroup(name);
  if (!group) return categories;
  const allowed = new Set(CATEGORY_GROUPS[group] || []);
  return categories.filter((c) => allowed.has(c.id));
}

/**
 * Filter a {id,label}[] type list down to those that belong to the given
 * kind. Pass an empty/null kind to receive the full list unchanged.
 *
 * @template T
 * @param {AssetKind | null | undefined} kind
 * @param {Array<{ id: string } & T>} types
 * @returns {Array<{ id: string } & T>}
 */
export function filterTypesByKind(kind, types) {
  if (!kind) return types;
  const allowed = new Set(TYPES_BY_KIND[kind] || []);
  return types.filter((t) => allowed.has(t.id));
}
