import { displayAssetName, displayAssetDescription } from './i18nAsset';

/**
 * Build a minimal Asset-like object for tests.
 * @param {Partial<import('../domain/repositories/AssetRepository').Asset>} patch
 */
function makeAsset(patch = {}) {
  return {
    id: 'a1',
    sku: 'LAP-01',
    name: 'MacBook Pro',
    description: 'Space Black',
    nameI18n: null,
    descriptionI18n: null,
    sourceLanguage: 'hy',
    ...patch,
  };
}

describe('displayAssetName', () => {
  test('falls back to asset.name when no i18n map is present', () => {
    expect(displayAssetName(makeAsset(), 'hy')).toBe('MacBook Pro');
    expect(displayAssetName(makeAsset(), 'en')).toBe('MacBook Pro');
    expect(displayAssetName(makeAsset(), 'ru')).toBe('MacBook Pro');
  });

  test('returns the exact-locale override when present', () => {
    const asset = makeAsset({
      nameI18n: { hy: 'Նոութբուք', en: 'Laptop', ru: 'Ноутбук' },
    });
    expect(displayAssetName(asset, 'hy')).toBe('Նոութբուք');
    expect(displayAssetName(asset, 'en')).toBe('Laptop');
    expect(displayAssetName(asset, 'ru')).toBe('Ноутбук');
  });

  test('falls through to sourceLanguage override when requested locale is missing', () => {
    const asset = makeAsset({
      sourceLanguage: 'en',
      name: 'MacBook Pro',
      nameI18n: { en: 'Laptop EN override' },
    });
    // ru is absent; source is en so the en override wins over the raw name
    expect(displayAssetName(asset, 'ru')).toBe('Laptop EN override');
  });

  test('falls through to asset.name when both requested and source locale overrides are missing', () => {
    const asset = makeAsset({
      sourceLanguage: 'hy',
      name: 'Raw hy name',
      nameI18n: { en: 'Laptop' }, // only en; hy missing
    });
    // requested ru — not found; sourceLanguage hy — not found in the map
    // → falls back to raw .name
    expect(displayAssetName(asset, 'ru')).toBe('Raw hy name');
  });

  test('ignores blank-string locales in the override map', () => {
    const asset = makeAsset({
      name: 'Raw',
      nameI18n: { ru: '   ', en: 'Laptop' },
      sourceLanguage: 'en',
    });
    expect(displayAssetName(asset, 'ru')).toBe('Laptop'); // blank ru → fall to en source
  });

  test('coerces unknown locales to the default locale', () => {
    const asset = makeAsset({
      nameI18n: { hy: 'hy-name', en: 'en-name' },
    });
    expect(displayAssetName(asset, 'de')).toBe('hy-name'); // unknown → default 'hy'
  });

  test('returns empty string for null / undefined asset', () => {
    expect(displayAssetName(null, 'hy')).toBe('');
    expect(displayAssetName(undefined, 'en')).toBe('');
  });

  test('survives a missing raw name without throwing', () => {
    const asset = makeAsset({ name: /** @type {any} */ (undefined) });
    expect(displayAssetName(asset, 'hy')).toBe('');
  });
});

describe('displayAssetDescription', () => {
  test('mirrors name-helper behaviour for descriptionI18n / description', () => {
    const asset = makeAsset({
      description: 'Raw description',
      descriptionI18n: { en: 'English description' },
      sourceLanguage: 'en',
    });
    expect(displayAssetDescription(asset, 'en')).toBe('English description');
    expect(displayAssetDescription(asset, 'ru')).toBe('English description'); // source en override
    expect(displayAssetDescription(asset, 'hy')).toBe('English description');
  });

  test('empty string when everything is blank', () => {
    const asset = makeAsset({ description: '', descriptionI18n: null });
    expect(displayAssetDescription(asset, 'hy')).toBe('');
  });
});
