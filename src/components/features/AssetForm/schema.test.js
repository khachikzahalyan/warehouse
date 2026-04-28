import { validateQuickAdd } from './schema';

const settings = { inventoryCodeThresholdAmd: 50000, usdToAmd: 390 };

/** Convenience builder. */
function form(overrides = {}) {
  return {
    kind: 'device',
    hasCode: true,
    name: 'Dell laptop',
    category: 'laptop',
    model: 'XPS-13',
    code: 'INV-001',
    condition: 'new',
    warrantyStart: null,
    warrantyEnd: null,
    quantity: 1,
    price: null,
    currency: 'AMD',
    ...overrides,
  };
}

describe('validateQuickAdd — kind gate', () => {
  test('missing kind blocks everything else', () => {
    const r = validateQuickAdd(form({ kind: null }), settings);
    expect(r.ok).toBe(false);
    expect(r.errors.kind).toBe('kindRequired');
  });

  test('unknown kind is rejected', () => {
    const r = validateQuickAdd(form({ kind: 'license' }), settings);
    expect(r.ok).toBe(false);
    expect(r.errors.kind).toBe('kindRequired');
  });
});

describe('validateQuickAdd — happy paths', () => {
  test('device + tracked + condition new is ok', () => {
    const r = validateQuickAdd(form(), settings);
    expect(r.ok).toBe(true);
    expect(r.normalized.kind).toBe('device');
    expect(r.normalized.hasCode).toBe(true);
    expect(r.normalized.code).toBe('INV-001');
    expect(r.normalized.needsReview).toBe(false);
  });

  test('furniture batch (non-tracked) with quantity is ok', () => {
    const r = validateQuickAdd(
      form({ kind: 'furniture', hasCode: false, model: '', code: '', quantity: 4, category: 'desk' }),
      settings,
    );
    expect(r.ok).toBe(true);
    expect(r.normalized.quantity).toBe(4);
    expect(r.normalized.needsReview).toBe(false);
  });

  test('accessory hides hasCode (forced false) and requires quantity', () => {
    const r = validateQuickAdd(
      form({ kind: 'accessory', hasCode: null, model: '', code: '', category: 'mouse', quantity: 5 }),
      settings,
    );
    expect(r.ok).toBe(true);
    expect(r.normalized.hasCode).toBe(false);
    expect(r.normalized.quantity).toBe(5);
  });

  test('other kind sets needsReview: true on normalized output', () => {
    const r = validateQuickAdd(
      form({ kind: 'other', hasCode: false, model: '', code: '', category: 'other_misc', quantity: 1 }),
      settings,
    );
    expect(r.ok).toBe(true);
    expect(r.normalized.needsReview).toBe(true);
  });
});

describe('validateQuickAdd — required field errors', () => {
  test('empty name + category + condition produce errors', () => {
    const r = validateQuickAdd(
      form({ name: '', category: '', condition: '' }),
      settings,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.name).toBe('required');
    expect(r.errors.category).toBe('required');
    expect(r.errors.condition).toBe('required');
  });

  test('hasCode=true but model missing → model required', () => {
    const r = validateQuickAdd(form({ model: '' }), settings);
    expect(r.ok).toBe(false);
    expect(r.errors.model).toBe('required');
  });

  test('hasCode=true but code missing → code required', () => {
    const r = validateQuickAdd(form({ code: '' }), settings);
    expect(r.ok).toBe(false);
    expect(r.errors.code).toBe('required');
  });

  test('non-tracked but quantity=0 → quantity error', () => {
    const r = validateQuickAdd(
      form({ kind: 'furniture', hasCode: false, model: '', code: '', quantity: 0, category: 'desk' }),
      settings,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.quantity).toBe('min1');
  });

  test('warranty end before start → warrantyEnd error', () => {
    const r = validateQuickAdd(
      form({
        warrantyStart: new Date('2026-06-01'),
        warrantyEnd: new Date('2026-05-01'),
      }),
      settings,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.warrantyEnd).toBe('warrantyEndBeforeStart');
  });
});

describe('validateQuickAdd — inventory-code threshold', () => {
  test('device price 60000 AMD > 50000 → code required AND form must be tracked', () => {
    // Try to submit non-tracked at high price → rejected
    const r = validateQuickAdd(
      form({ kind: 'device', hasCode: false, model: '', code: '', price: 60000, currency: 'AMD', quantity: 2, category: 'laptop' }),
      settings,
    );
    expect(r.ok).toBe(false);
    expect(r.codeRequired).toBe(true);
    expect(r.errors.hasCode).toBe('codeRequiredAboveThreshold');
    expect(r.errors.code).toBe('codeRequiredAboveThreshold');
  });

  test('device price 60000 AMD with code present passes', () => {
    const r = validateQuickAdd(
      form({ kind: 'device', hasCode: true, model: 'XPS', code: 'INV-77', price: 60000, currency: 'AMD' }),
      settings,
    );
    expect(r.ok).toBe(true);
    expect(r.codeRequired).toBe(true);
    expect(r.normalized.code).toBe('INV-77');
  });

  test('device price exactly 50000 AMD does NOT require code (strictly greater)', () => {
    const r = validateQuickAdd(
      form({ kind: 'device', hasCode: false, model: '', code: '', price: 50000, currency: 'AMD', quantity: 1, category: 'laptop' }),
      settings,
    );
    expect(r.codeRequired).toBe(false);
    expect(r.ok).toBe(true);
  });

  test('accessory at high price never requires inventory code', () => {
    const r = validateQuickAdd(
      form({
        kind: 'accessory', hasCode: null, model: '', code: '', price: 999999, currency: 'AMD', quantity: 1, category: 'mouse',
      }),
      settings,
    );
    expect(r.codeRequired).toBe(false);
    expect(r.ok).toBe(true);
  });

  test('USD price above threshold (after FX conversion) requires code', () => {
    // 200 USD * 390 = 78,000 AMD > 50,000
    const r = validateQuickAdd(
      form({ kind: 'device', hasCode: false, model: '', code: '', price: 200, currency: 'USD', quantity: 1, category: 'laptop' }),
      settings,
    );
    expect(r.codeRequired).toBe(true);
    expect(r.ok).toBe(false);
  });

  test('uses default 50000 AMD threshold when settings omitted', () => {
    const r = validateQuickAdd(
      form({ kind: 'device', hasCode: false, model: '', code: '', price: 50001, currency: 'AMD', quantity: 1, category: 'laptop' }),
      // no settings
    );
    expect(r.codeRequired).toBe(true);
  });
});
