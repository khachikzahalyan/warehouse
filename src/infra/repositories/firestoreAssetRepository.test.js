// src/infra/repositories/firestoreAssetRepository.test.js
//
// CRA's Jest config has `resetMocks: true` which resets mock implementations
// between every test. Mocks that need specific return values must be set in
// each test or beforeEach. Closures in jest.mock() factories that reference
// outer variables are fine for wiring, but the functions they call get reset.

import {
  createAssetRepository,
  UniqueConstraintError,
} from './firestoreAssetRepository';

// These variables are used as proxy targets inside the jest.mock factory
// closures. CRA's resetMocks wipes their implementations between tests, so
// every test/beforeEach that needs a specific return value must call
// mockXxx.mockReturnValue(...) or mockXxx.mockResolvedValue(...) explicitly.
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockServerTimestamp = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'assetsCol'),
  query: jest.fn((...args) => ({ args })),
  where: jest.fn((...args) => ({ where: args })),
  limit: jest.fn((n) => ({ limit: n })),
  orderBy: jest.fn((f, d) => ({ orderBy: [f, d] })),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  addDoc: (...a) => mockAddDoc(...a),
  onSnapshot: (...a) => mockOnSnapshot(...a),
  serverTimestamp: () => mockServerTimestamp(),
  doc: jest.fn((db, col, id) => ({ _col: col, _id: id })),
}));
jest.mock('../../lib/firebase', () => ({ db: {} }));

// ─── UniqueConstraintError ────────────────────────────────────────────────────

describe('UniqueConstraintError', () => {
  test('is an Error subclass with field/value/conflictingId', () => {
    const err = new UniqueConstraintError('sku', 'SKU-1', 'asset-99');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(UniqueConstraintError);
    expect(err.field).toBe('sku');
    expect(err.value).toBe('SKU-1');
    expect(err.conflictingId).toBe('asset-99');
    expect(err.message).toMatch(/sku/i);
  });
});

// ─── isSkuUnique ──────────────────────────────────────────────────────────────

describe('firestoreAssetRepository.isSkuUnique', () => {
  let repo;
  beforeEach(() => {
    repo = createAssetRepository();
  });

  test('empty result => unique', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    const result = await repo.isSkuUnique('SKU-1');
    expect(result).toEqual({ unique: true, conflictId: null, conflictName: null });
  });

  test('result hit => not unique with conflict info', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'asset-99', data: () => ({ name: 'Existing laptop' }) }],
    });
    const result = await repo.isSkuUnique('SKU-1');
    expect(result).toEqual({ unique: false, conflictId: 'asset-99', conflictName: 'Existing laptop' });
  });

  test('exceptId excludes the same doc (self-update scenario)', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'asset-self', data: () => ({ name: 'self' }) }],
    });
    const result = await repo.isSkuUnique('SKU-1', 'asset-self');
    expect(result).toEqual({ unique: true, conflictId: null, conflictName: null });
  });

  test('null/empty value is considered unique (no query needed)', async () => {
    const result = await repo.isSkuUnique('');
    expect(result).toEqual({ unique: true, conflictId: null, conflictName: null });
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});

// ─── isBarcodeUnique ──────────────────────────────────────────────────────────

describe('firestoreAssetRepository.isBarcodeUnique', () => {
  let repo;
  beforeEach(() => {
    repo = createAssetRepository();
  });

  test('empty => unique', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    expect(await repo.isBarcodeUnique('BC-1')).toEqual({
      unique: true, conflictId: null, conflictName: null,
    });
  });

  test('hit => not unique', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'a-5', data: () => ({ name: 'Mouse' }) }],
    });
    expect(await repo.isBarcodeUnique('BC-1')).toEqual({
      unique: false, conflictId: 'a-5', conflictName: 'Mouse',
    });
  });

  test('exceptId ignored self', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'self-id', data: () => ({ name: 'x' }) }],
    });
    expect(await repo.isBarcodeUnique('BC-1', 'self-id')).toEqual({
      unique: true, conflictId: null, conflictName: null,
    });
  });
});

// ─── isSerialUnique ───────────────────────────────────────────────────────────

describe('firestoreAssetRepository.isSerialUnique', () => {
  let repo;
  beforeEach(() => {
    repo = createAssetRepository();
  });

  test('empty => unique', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    expect(await repo.isSerialUnique('SN-X')).toEqual({
      unique: true, conflictId: null, conflictName: null,
    });
  });

  test('hit => not unique', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'a-10', data: () => ({ name: 'Laptop' }) }],
    });
    expect(await repo.isSerialUnique('SN-X')).toEqual({
      unique: false, conflictId: 'a-10', conflictName: 'Laptop',
    });
  });
});

// ─── getById ─────────────────────────────────────────────────────────────────

describe('firestoreAssetRepository.getById', () => {
  let repo;
  beforeEach(() => {
    repo = createAssetRepository();
  });

  test('returns null when doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await repo.getById('missing-id')).toBeNull();
  });

  test('returns mapped asset when doc exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'a-42',
      data: () => ({
        sku: 'SKU-42',
        name: 'Monitor',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-02') },
      }),
    });
    const asset = await repo.getById('a-42');
    expect(asset).not.toBeNull();
    expect(asset.id).toBe('a-42');
    expect(asset.sku).toBe('SKU-42');
    expect(asset.createdAt).toBeInstanceOf(Date);
    expect(asset.updatedAt).toBeInstanceOf(Date);
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('firestoreAssetRepository.create', () => {
  let repo;
  const baseInput = {
    sku: 'OK', name: 'Mouse', sourceLanguage: 'en', category: 'peripheral',
    brand: 'Logi', model: 'M1',
    branchId: 'br-1', holderType: 'storage', holderId: 'br-1', holderDisplayName: 'Main',
    quantity: 5, currency: 'AMD', purchasePrice: 39000, priceUsd: 100, isTracked: false,
    barcode: 'B-OK', serialNumber: null,
  };

  beforeEach(() => {
    // resetMocks: true wipes implementations; restore serverTimestamp here.
    mockServerTimestamp.mockReturnValue('SERVER_TS');
    repo = createAssetRepository({ uid: 'user-1' });
  });

  test('throws when no uid provided', async () => {
    const noUidRepo = createAssetRepository();
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    await expect(noUidRepo.create(baseInput)).rejects.toThrow(/uid/i);
  });

  test('throws UniqueConstraintError when SKU is taken', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'a-1', data: () => ({ name: 'X' }) }],
    });
    await expect(repo.create({ ...baseInput, sku: 'DUP' })).rejects.toThrow(UniqueConstraintError);
  });

  test('throw message mentions sku field', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'a-1', data: () => ({ name: 'X' }) }],
    });
    await expect(repo.create({ ...baseInput, sku: 'DUP' })).rejects.toThrow(/sku/i);
  });

  test('throws UniqueConstraintError when barcode is taken (non-tracked)', async () => {
    // SKU passes, barcode fails
    mockGetDocs
      .mockResolvedValueOnce({ empty: true, docs: [] }) // sku check
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'a-2', data: () => ({ name: 'Other' }) }],
      }); // barcode check
    await expect(
      repo.create({ ...baseInput, isTracked: false, barcode: 'TAKEN', serialNumber: null }),
    ).rejects.toThrow(UniqueConstraintError);
  });

  test('throws UniqueConstraintError when serialNumber is taken (tracked)', async () => {
    // SKU passes, serial fails
    mockGetDocs
      .mockResolvedValueOnce({ empty: true, docs: [] }) // sku
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'a-3', data: () => ({ name: 'Other' }) }],
      }); // serial
    await expect(
      repo.create({ ...baseInput, isTracked: true, quantity: 1, serialNumber: 'SN-TAKEN', barcode: null }),
    ).rejects.toThrow(UniqueConstraintError);
  });

  test('happy path writes all derived fields and returns new id', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'new-asset' });

    const id = await repo.create(baseInput);

    expect(id).toBe('new-asset');
    const written = mockAddDoc.mock.calls[0][1];
    expect(written.priceUsd).toBe(100);
    expect(written.quantity).toBe(5);
    expect(written.isTracked).toBe(false);
    expect(written.createdBy).toBe('user-1');
    expect(written.updatedBy).toBe('user-1');
    expect(written.holderType).toBe('storage');
    expect(written.status).toBe('active');
    expect(written.condition).toBe('new');
    expect(written.createdAt).toBe('SERVER_TS');
    expect(written.updatedAt).toBe('SERVER_TS');
  });

  test('forces quantity=1 when isTracked=true regardless of input', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'tracked-asset' });

    await repo.create({
      ...baseInput,
      isTracked: true,
      quantity: 10, // should be overridden to 1
      serialNumber: 'SN-123',
      barcode: null,
    });

    const written = mockAddDoc.mock.calls[0][1];
    expect(written.quantity).toBe(1);
    expect(written.isTracked).toBe(true);
  });

  test('persists kind and defaults needsReview=false for non-other kinds', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'kind-asset' });

    await repo.create({ ...baseInput, kind: 'device' });

    const written = mockAddDoc.mock.calls[0][1];
    expect(written.kind).toBe('device');
    expect(written.needsReview).toBe(false);
  });

  test('defaults kind to "other" and needsReview to true when kind omitted', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'fallback-asset' });

    // baseInput intentionally omits kind
    await repo.create(baseInput);

    const written = mockAddDoc.mock.calls[0][1];
    expect(written.kind).toBe('other');
    expect(written.needsReview).toBe(true);
  });

  test('explicit needsReview override is honoured', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'override-asset' });

    await repo.create({ ...baseInput, kind: 'device', needsReview: true });

    const written = mockAddDoc.mock.calls[0][1];
    expect(written.kind).toBe('device');
    expect(written.needsReview).toBe(true);
  });

  test('priceUsd passed in from caller is stored as-is', async () => {
    // The repo stores the caller-provided priceUsd (computed by the form layer).
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'id-amd' });

    await repo.create({ ...baseInput, purchasePrice: 39000, currency: 'AMD', priceUsd: 100 });

    const written = mockAddDoc.mock.calls[0][1];
    expect(written.priceUsd).toBe(100);
  });
});

// ─── subscribeStorage (happy-path) ────────────────────────────────────────────

describe('firestoreAssetRepository.subscribeStorage', () => {
  let repo;
  beforeEach(() => {
    repo = createAssetRepository();
  });

  test('passes holderType + orderBy + limit constraints and calls onChange with mapped docs', () => {
    const fakeUnsub = jest.fn();
    mockOnSnapshot.mockImplementation((_q, onNext) => {
      onNext({
        docs: [
          { id: 'a-1', data: () => ({ name: 'Keyboard', holderType: 'storage', createdAt: null, updatedAt: null }) },
        ],
      });
      return fakeUnsub;
    });

    const onChange = jest.fn();
    const unsub = repo.subscribeStorage({}, onChange, jest.fn());

    expect(onChange).toHaveBeenCalledTimes(1);
    const items = onChange.mock.calls[0][0];
    expect(items[0].id).toBe('a-1');
    expect(items[0].name).toBe('Keyboard');
    expect(unsub).toBe(fakeUnsub);
  });
});
