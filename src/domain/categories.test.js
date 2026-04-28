import {
  ASSET_KINDS,
  LEGACY_ASSET_KINDS,
  TYPES_BY_KIND,
  LEGACY_CATEGORY_TO_KIND,
  suggestCategoryGroup,
  suggestKind,
  inferKind,
  kindFromCategory,
  filterTypesByKind,
  filterCategoriesByName,
} from './categories';

describe('ASSET_KINDS', () => {
  test('contains exactly device, furniture, accessory (other dropped from create)', () => {
    expect([...ASSET_KINDS]).toEqual(['device', 'furniture', 'accessory']);
  });

  test('is frozen', () => {
    expect(Object.isFrozen(ASSET_KINDS)).toBe(true);
  });

  test('does NOT include other (other is read-only / legacy)', () => {
    expect(ASSET_KINDS.includes('other')).toBe(false);
  });
});

describe('LEGACY_ASSET_KINDS', () => {
  test('contains all four kinds for read-path acceptance', () => {
    expect([...LEGACY_ASSET_KINDS]).toEqual(['device', 'furniture', 'accessory', 'other']);
  });

  test('is frozen', () => {
    expect(Object.isFrozen(LEGACY_ASSET_KINDS)).toBe(true);
  });
});

describe('TYPES_BY_KIND', () => {
  test('device has 16 entries', () => {
    expect(TYPES_BY_KIND.device.length).toBe(16);
  });

  test('furniture has 22 entries', () => {
    expect(TYPES_BY_KIND.furniture.length).toBe(22);
  });

  test('accessory has 14 entries', () => {
    expect(TYPES_BY_KIND.accessory.length).toBe(14);
  });

  test('other has at least one fallback entry (legacy)', () => {
    expect(TYPES_BY_KIND.other.length).toBeGreaterThan(0);
  });

  test('every legacy kind appears in TYPES_BY_KIND', () => {
    for (const k of LEGACY_ASSET_KINDS) {
      expect(TYPES_BY_KIND[k]).toBeDefined();
    }
  });

  test('no type id appears in two kinds', () => {
    const seen = new Map();
    for (const kind of LEGACY_ASSET_KINDS) {
      for (const id of TYPES_BY_KIND[kind]) {
        if (seen.has(id)) {
          throw new Error(`Type "${id}" appears in both ${seen.get(id)} and ${kind}`);
        }
        seen.set(id, kind);
      }
    }
  });
});

describe('LEGACY_CATEGORY_TO_KIND', () => {
  test('every legacy category maps to a known kind', () => {
    // Read-path acceptance uses LEGACY_ASSET_KINDS — 'vehicle' maps to legacy 'other'.
    const known = new Set(LEGACY_ASSET_KINDS);
    for (const [legacy, kind] of Object.entries(LEGACY_CATEGORY_TO_KIND)) {
      expect(known.has(kind)).toBe(true);
      // satisfy lint
      expect(typeof legacy).toBe('string');
    }
  });

  test('vehicle maps to other (per spec — vehicle dropped from new taxonomy)', () => {
    expect(LEGACY_CATEGORY_TO_KIND.vehicle).toBe('other');
  });

  test('peripheral maps to accessory (per spec)', () => {
    expect(LEGACY_CATEGORY_TO_KIND.peripheral).toBe('accessory');
  });

  test('electronics-style legacy keys map to device', () => {
    expect(LEGACY_CATEGORY_TO_KIND.laptop).toBe('device');
    expect(LEGACY_CATEGORY_TO_KIND.desktop).toBe('device');
    expect(LEGACY_CATEGORY_TO_KIND.monitor).toBe('device');
    expect(LEGACY_CATEGORY_TO_KIND.phone).toBe('device');
    expect(LEGACY_CATEGORY_TO_KIND.tablet).toBe('device');
  });

  test('furniture legacy key maps to furniture', () => {
    expect(LEGACY_CATEGORY_TO_KIND.furniture).toBe('furniture');
  });
});

describe('kindFromCategory', () => {
  test('returns null for empty/missing category', () => {
    expect(kindFromCategory('')).toBeNull();
    expect(kindFromCategory(null)).toBeNull();
    expect(kindFromCategory(undefined)).toBeNull();
  });

  test('maps legacy category strings via LEGACY_CATEGORY_TO_KIND', () => {
    expect(kindFromCategory('laptop')).toBe('device');
    expect(kindFromCategory('peripheral')).toBe('accessory');
    expect(kindFromCategory('vehicle')).toBe('other');
    expect(kindFromCategory('furniture')).toBe('furniture');
  });

  test('recognises new per-kind type ids (no legacy table needed)', () => {
    expect(kindFromCategory('printer')).toBe('device');
    expect(kindFromCategory('cabinet')).toBe('furniture');
    expect(kindFromCategory('keyboard')).toBe('accessory');
    expect(kindFromCategory('other_misc')).toBe('other');
  });

  test('returns null for unknown values', () => {
    expect(kindFromCategory('totally-unknown-thing')).toBeNull();
  });
});

describe('suggestCategoryGroup', () => {
  test('returns null on empty input', () => {
    expect(suggestCategoryGroup('')).toBeNull();
  });

  test('English laptop → electronics', () => {
    expect(suggestCategoryGroup('Dell laptop XPS')).toBe('electronics');
  });

  test('Russian ноутбук → electronics', () => {
    expect(suggestCategoryGroup('Ноутбук Lenovo')).toBe('electronics');
  });

  test('chair → furniture', () => {
    expect(suggestCategoryGroup('office chair')).toBe('furniture');
  });

  test('mouse → accessory', () => {
    expect(suggestCategoryGroup('Logitech mouse')).toBe('accessory');
  });

  test('кабель → accessory', () => {
    expect(suggestCategoryGroup('кабель HDMI')).toBe('accessory');
  });

  test('returns null when no keyword matches', () => {
    expect(suggestCategoryGroup('xyz123 widget')).toBeNull();
  });
});

describe('suggestKind', () => {
  test('laptop name → device', () => {
    expect(suggestKind('MacBook Pro 14"')).toBe('device');
  });

  test('chair name → furniture', () => {
    expect(suggestKind('Office chair Herman Miller')).toBe('furniture');
  });

  test('mouse name → accessory', () => {
    expect(suggestKind('USB mouse')).toBe('accessory');
  });

  test('vehicle keyword → other (per spec, vehicle is dropped)', () => {
    expect(suggestKind('company car Toyota')).toBe('other');
  });

  test('unrecognised name → null', () => {
    expect(suggestKind('xyz widget 999')).toBeNull();
  });

  test('empty name → null', () => {
    expect(suggestKind('')).toBeNull();
  });
});

describe('inferKind', () => {
  test('confident match returns confident: true', () => {
    expect(inferKind('Dell laptop')).toEqual({ kind: 'device', confident: true });
  });

  test('unknown name returns kind: other and confident: false', () => {
    expect(inferKind('xyz mystery 999')).toEqual({ kind: 'other', confident: false });
  });

  test('empty name returns kind: other and confident: false', () => {
    expect(inferKind('')).toEqual({ kind: 'other', confident: false });
  });
});

describe('filterTypesByKind', () => {
  const allTypes = [
    { id: 'laptop', label: 'Laptop' },
    { id: 'desk', label: 'Desk' },
    { id: 'mouse', label: 'Mouse' },
    { id: 'other_misc', label: 'Other' },
  ];

  test('null kind returns the original list', () => {
    expect(filterTypesByKind(null, allTypes)).toEqual(allTypes);
  });

  test('device narrows to device-only types', () => {
    expect(filterTypesByKind('device', allTypes).map((t) => t.id)).toEqual(['laptop']);
  });

  test('furniture narrows to furniture-only types', () => {
    expect(filterTypesByKind('furniture', allTypes).map((t) => t.id)).toEqual(['desk']);
  });

  test('accessory narrows to accessory-only types', () => {
    expect(filterTypesByKind('accessory', allTypes).map((t) => t.id)).toEqual(['mouse']);
  });

  test('other narrows to other-only types', () => {
    expect(filterTypesByKind('other', allTypes).map((t) => t.id)).toEqual(['other_misc']);
  });
});

describe('filterCategoriesByName (legacy back-compat)', () => {
  const cats = [
    { id: 'laptop', label: 'Laptop' },
    { id: 'furniture', label: 'Furniture' },
    { id: 'peripheral', label: 'Peripheral' },
  ];

  test('empty name returns full list', () => {
    expect(filterCategoriesByName('', cats)).toEqual(cats);
  });

  test('"Dell laptop" narrows to electronics group', () => {
    expect(filterCategoriesByName('Dell laptop', cats).map((c) => c.id)).toEqual(['laptop']);
  });

  test('"office chair" narrows to furniture group', () => {
    expect(filterCategoriesByName('office chair', cats).map((c) => c.id)).toEqual(['furniture']);
  });
});
