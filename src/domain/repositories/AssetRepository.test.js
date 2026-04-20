import { toLocalizedText, toAssetSourceLanguage } from './AssetRepository';

describe('toLocalizedText', () => {
  test('returns null for null / undefined / non-objects', () => {
    expect(toLocalizedText(null)).toBeNull();
    expect(toLocalizedText(undefined)).toBeNull();
    expect(toLocalizedText('hy')).toBeNull();
    expect(toLocalizedText(42)).toBeNull();
  });

  test('drops locales whose value is missing, blank, or not a string', () => {
    expect(
      toLocalizedText({ hy: '  ', en: 'MacBook', ru: null, de: 'ignored' }),
    ).toEqual({ en: 'MacBook' });
  });

  test('returns null when every locale is absent or blank', () => {
    expect(toLocalizedText({})).toBeNull();
    expect(toLocalizedText({ hy: '', en: '   ', ru: '' })).toBeNull();
  });

  test('trims whitespace around retained values', () => {
    expect(toLocalizedText({ hy: '  Նոութբուք  ', en: 'Laptop' })).toEqual({
      hy: 'Նոութբուք',
      en: 'Laptop',
    });
  });

  test('keeps all three locales when populated', () => {
    expect(
      toLocalizedText({ hy: 'Նոութբուք', en: 'Laptop', ru: 'Ноутбук' }),
    ).toEqual({ hy: 'Նոութբուք', en: 'Laptop', ru: 'Ноутбук' });
  });
});

describe('toAssetSourceLanguage', () => {
  test.each(['hy', 'en', 'ru'])('accepts %s', (l) => {
    expect(toAssetSourceLanguage(l)).toBe(l);
  });

  test('defaults unknown input to "hy"', () => {
    expect(toAssetSourceLanguage(undefined)).toBe('hy');
    expect(toAssetSourceLanguage('xx')).toBe('hy');
    expect(toAssetSourceLanguage(null)).toBe('hy');
  });
});
