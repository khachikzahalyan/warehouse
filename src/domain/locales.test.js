import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE_CHAIN,
  toAppLocale,
} from './locales';

describe('APP_LOCALES constant', () => {
  test('is frozen and exposes exactly the three supported locales in display order', () => {
    expect(Object.isFrozen(APP_LOCALES)).toBe(true);
    expect([...APP_LOCALES]).toEqual(['hy', 'en', 'ru']);
  });
});

describe('DEFAULT_LOCALE constant', () => {
  test('is "hy" per the user-locked decision', () => {
    expect(DEFAULT_LOCALE).toBe('hy');
  });
});

describe('FALLBACK_LOCALE_CHAIN', () => {
  test('is frozen and falls from hy to en', () => {
    expect(Object.isFrozen(FALLBACK_LOCALE_CHAIN)).toBe(true);
    expect([...FALLBACK_LOCALE_CHAIN]).toEqual(['hy', 'en']);
  });
});

describe('toAppLocale', () => {
  test.each(['hy', 'en', 'ru'])('accepts known locale %s', (l) => {
    expect(toAppLocale(l)).toBe(l);
  });

  test('coerces unknown input to DEFAULT_LOCALE', () => {
    expect(toAppLocale('de')).toBe(DEFAULT_LOCALE);
    expect(toAppLocale('EN')).toBe(DEFAULT_LOCALE); // case-sensitive on purpose
    expect(toAppLocale('')).toBe(DEFAULT_LOCALE);
    expect(toAppLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(toAppLocale(null)).toBe(DEFAULT_LOCALE);
    expect(toAppLocale(0)).toBe(DEFAULT_LOCALE);
    expect(toAppLocale({})).toBe(DEFAULT_LOCALE);
    expect(toAppLocale([])).toBe(DEFAULT_LOCALE);
  });
});
