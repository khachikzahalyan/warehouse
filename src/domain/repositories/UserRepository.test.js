import {
  toUserRole,
  toUserStatus,
  toUserPreferredLocale,
  USER_ROLES,
  USER_STATUSES,
} from './UserRepository';

describe('toUserRole', () => {
  test.each(['user', 'admin', 'super_admin'])('accepts known role %s', (r) => {
    expect(toUserRole(r)).toBe(r);
  });

  test('coerces unknown roles to "user"', () => {
    expect(toUserRole('manager')).toBe('user');
    expect(toUserRole('viewer')).toBe('user');
    expect(toUserRole(undefined)).toBe('user');
    expect(toUserRole(null)).toBe('user');
    expect(toUserRole(42)).toBe('user');
    expect(toUserRole({})).toBe('user');
  });
});

describe('toUserStatus', () => {
  test.each(['active', 'disabled'])('accepts known status %s', (s) => {
    expect(toUserStatus(s)).toBe(s);
  });

  test('coerces unknown statuses to "disabled" (safe default)', () => {
    expect(toUserStatus('pending')).toBe('disabled');
    expect(toUserStatus(undefined)).toBe('disabled');
    expect(toUserStatus(null)).toBe('disabled');
  });
});

describe('toUserPreferredLocale', () => {
  test.each(['hy', 'en', 'ru'])('accepts known locale %s', (l) => {
    expect(toUserPreferredLocale(l)).toBe(l);
  });

  test('coerces unknown locales to default "hy"', () => {
    expect(toUserPreferredLocale('de')).toBe('hy');
    expect(toUserPreferredLocale('')).toBe('hy');
    expect(toUserPreferredLocale(undefined)).toBe('hy');
    expect(toUserPreferredLocale(null)).toBe('hy');
    expect(toUserPreferredLocale(42)).toBe('hy');
  });
});

describe('role / status exports are frozen', () => {
  test('USER_ROLES is frozen and complete', () => {
    expect(Object.isFrozen(USER_ROLES)).toBe(true);
    expect([...USER_ROLES]).toEqual(['user', 'admin', 'super_admin']);
  });
  test('USER_STATUSES is frozen and complete', () => {
    expect(Object.isFrozen(USER_STATUSES)).toBe(true);
    expect([...USER_STATUSES]).toEqual(['active', 'disabled']);
  });
});
