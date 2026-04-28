import { formatDate, formatDateRange } from './formatDate';

describe('formatDate', () => {
  test('null / undefined / empty string → null', () => {
    expect(formatDate(null, 'en')).toBeNull();
    expect(formatDate(undefined, 'en')).toBeNull();
    expect(formatDate('', 'en')).toBeNull();
  });

  test('invalid date → null', () => {
    expect(formatDate('not-a-date', 'en')).toBeNull();
    expect(formatDate(new Date('garbage'), 'en')).toBeNull();
  });

  test('en → MM/DD/YYYY with zero-padding', () => {
    expect(formatDate(new Date(2026, 3, 28), 'en')).toBe('04/28/2026');
    expect(formatDate(new Date(2026, 0, 5), 'en')).toBe('01/05/2026');
  });

  test('ru → DD.MM.YYYY with zero-padding', () => {
    expect(formatDate(new Date(2026, 3, 28), 'ru')).toBe('28.04.2026');
  });

  test('hy → DD.MM.YYYY (same as ru)', () => {
    expect(formatDate(new Date(2026, 3, 28), 'hy')).toBe('28.04.2026');
  });

  test('strips region from compound language tags (en-US)', () => {
    expect(formatDate(new Date(2026, 3, 28), 'en-US')).toBe('04/28/2026');
  });

  test('accepts ISO string input', () => {
    expect(formatDate('2026-04-28', 'ru')).toBe('28.04.2026');
  });

  test('unknown language defaults to DD.MM.YYYY', () => {
    expect(formatDate(new Date(2026, 3, 28), 'xx')).toBe('28.04.2026');
  });
});

describe('formatDateRange', () => {
  test('both missing → null', () => {
    expect(formatDateRange(null, null, 'ru')).toBeNull();
  });

  test('start only → just start', () => {
    expect(formatDateRange(new Date(2026, 3, 28), null, 'ru')).toBe('28.04.2026');
  });

  test('end only → just end', () => {
    expect(formatDateRange(null, new Date(2027, 3, 28), 'ru')).toBe('28.04.2027');
  });

  test('both present → "start — end" with em-dash', () => {
    expect(
      formatDateRange(new Date(2026, 3, 28), new Date(2027, 3, 28), 'ru'),
    ).toBe('28.04.2026 — 28.04.2027');
  });

  test('en uses MM/DD/YYYY on both ends', () => {
    expect(
      formatDateRange(new Date(2026, 3, 28), new Date(2027, 3, 28), 'en'),
    ).toBe('04/28/2026 — 04/28/2027');
  });
});
