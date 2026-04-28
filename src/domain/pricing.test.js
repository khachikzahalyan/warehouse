import {
  convertToUsd,
  isTracked,
  requiresInventoryCode,
  DEFAULT_TRACKING_THRESHOLD_USD,
  DEFAULT_USD_TO_AMD,
  DEFAULT_INVENTORY_CODE_THRESHOLD_AMD,
  SUPPORTED_CURRENCIES,
} from './pricing';

describe('pricing — defaults', () => {
  test('DEFAULT_TRACKING_THRESHOLD_USD is 500', () => {
    expect(DEFAULT_TRACKING_THRESHOLD_USD).toBe(500);
  });

  test('DEFAULT_USD_TO_AMD is 390', () => {
    expect(DEFAULT_USD_TO_AMD).toBe(390);
  });

  test('SUPPORTED_CURRENCIES is exactly ["USD", "AMD"]', () => {
    expect([...SUPPORTED_CURRENCIES]).toEqual(['USD', 'AMD']);
  });

  test('SUPPORTED_CURRENCIES is frozen (readonly)', () => {
    expect(Object.isFrozen(SUPPORTED_CURRENCIES)).toBe(true);
  });
});

describe('convertToUsd', () => {
  test('USD passes through unchanged', () => {
    expect(convertToUsd(100, 'USD', 390)).toBe(100);
  });

  test('USD pass-through ignores the rate value', () => {
    expect(convertToUsd(250, 'USD', 1)).toBe(250);
  });

  test('AMD divides by usdToAmd rate exactly', () => {
    expect(convertToUsd(39000, 'AMD', 390)).toBe(100);
  });

  test('AMD division uses provided rate (not default)', () => {
    expect(convertToUsd(20000, 'AMD', 400)).toBe(50);
  });

  test('null amount returns null (USD)', () => {
    expect(convertToUsd(null, 'USD', 390)).toBeNull();
  });

  test('null amount returns null (AMD)', () => {
    expect(convertToUsd(null, 'AMD', 390)).toBeNull();
  });

  test('unsupported currency throws', () => {
    expect(() => convertToUsd(100, 'EUR', 390)).toThrow(/currency/i);
  });

  test('non-positive rate throws (rate must be > 0)', () => {
    expect(() => convertToUsd(39000, 'AMD', 0)).toThrow();
    expect(() => convertToUsd(39000, 'AMD', -1)).toThrow();
  });
});

describe('pricing — DEFAULT_INVENTORY_CODE_THRESHOLD_AMD', () => {
  test('default is exactly 50000 AMD', () => {
    expect(DEFAULT_INVENTORY_CODE_THRESHOLD_AMD).toBe(50000);
  });
});

describe('requiresInventoryCode', () => {
  // device + furniture only
  test('accessory is never required regardless of price', () => {
    expect(
      requiresInventoryCode(
        { kind: 'accessory', price: 9999999, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('other is never required regardless of price', () => {
    expect(
      requiresInventoryCode(
        { kind: 'other', price: 9999999, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('device above threshold (AMD) returns true', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 60000, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(true);
  });

  test('furniture above threshold (AMD) returns true', () => {
    expect(
      requiresInventoryCode(
        { kind: 'furniture', price: 75000, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(true);
  });

  test('device exactly at threshold (AMD) returns false (strictly greater)', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 50000, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('device below threshold (AMD) returns false', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 49999, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('USD price is converted to AMD via fxRate before comparison', () => {
    // 200 USD * 390 = 78,000 AMD > 50,000 → required
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 200, currency: 'USD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(true);
    // 100 USD * 390 = 39,000 AMD < 50,000 → not required
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 100, currency: 'USD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('USD with no FX rate fails open (returns false)', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 9999, currency: 'USD' },
        { thresholdAmd: 50000 },
      ),
    ).toBe(false);
  });

  test('null price returns false', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: null, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('uses default threshold (50000 AMD) when no threshold supplied', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 50001, currency: 'AMD' },
      ),
    ).toBe(true);
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 49999, currency: 'AMD' },
      ),
    ).toBe(false);
  });

  test('unsupported currency returns false (fail open)', () => {
    expect(
      requiresInventoryCode(
        { kind: 'device', price: 9999, currency: 'EUR' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });

  test('null kind returns false', () => {
    expect(
      requiresInventoryCode(
        { kind: null, price: 99999, currency: 'AMD' },
        { thresholdAmd: 50000, fxRate: 390 },
      ),
    ).toBe(false);
  });
});

describe('isTracked', () => {
  test('priceUsd > threshold => true', () => {
    expect(isTracked(600, 500)).toBe(true);
  });

  test('priceUsd === threshold => true (boundary inclusive)', () => {
    expect(isTracked(500, 500)).toBe(true);
  });

  test('priceUsd < threshold => false', () => {
    expect(isTracked(499.99, 500)).toBe(false);
  });

  test('null priceUsd => false', () => {
    expect(isTracked(null, 500)).toBe(false);
  });

  test('null threshold => false (defensive: cannot decide without threshold)', () => {
    expect(isTracked(1000, null)).toBe(false);
  });

  test('both null => false', () => {
    expect(isTracked(null, null)).toBe(false);
  });
});
