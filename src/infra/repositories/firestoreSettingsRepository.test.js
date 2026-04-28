// src/infra/repositories/firestoreSettingsRepository.test.js
import {
  getWarehouseSettings,
  getExchangeRates,
  subscribeWarehouseSettings,
  subscribeExchangeRates,
  getCustomAssetKinds,
  subscribeCustomAssetKinds,
} from './firestoreSettingsRepository';
import { onSnapshot, getDoc } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('../../lib/firebase', () => ({ db: {} }));

describe('firestoreSettingsRepository — subscribeWarehouseSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  test('yields default threshold when doc is missing', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => false });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({
      trackingThresholdUsd: 500,
      inventoryCodeThresholdAmd: 50000,
    });
  });

  test('yields stored threshold when doc has a valid positive number', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ trackingThresholdUsd: 1200, inventoryCodeThresholdAmd: 75000 }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({
      trackingThresholdUsd: 1200,
      inventoryCodeThresholdAmd: 75000,
    });
  });

  test('falls back to default when trackingThresholdUsd is 0 (invalid)', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ trackingThresholdUsd: 0 }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({
      trackingThresholdUsd: 500,
      inventoryCodeThresholdAmd: 50000,
    });
  });

  test('falls back to default when trackingThresholdUsd is a string (non-number)', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ trackingThresholdUsd: 'bad' }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({
      trackingThresholdUsd: 500,
      inventoryCodeThresholdAmd: 50000,
    });
  });

  test('falls back to default for inventoryCodeThresholdAmd when invalid', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ trackingThresholdUsd: 600, inventoryCodeThresholdAmd: -10 }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeWarehouseSettings(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({
      trackingThresholdUsd: 600,
      inventoryCodeThresholdAmd: 50000,
    });
  });

  test('forwards onError to onSnapshot error handler', () => {
    const onError = jest.fn();
    const fakeErr = new Error('net');
    onSnapshot.mockImplementation((_ref, _onNext, onErr) => {
      onErr(fakeErr);
      return () => {};
    });
    subscribeWarehouseSettings(() => {}, onError);
    expect(onError).toHaveBeenCalledWith(fakeErr);
  });

  test('returns unsubscribe function', () => {
    const unsub = jest.fn();
    onSnapshot.mockReturnValue(unsub);
    const result = subscribeWarehouseSettings(() => {}, () => {});
    expect(result).toBe(unsub);
  });
});

describe('firestoreSettingsRepository — subscribeExchangeRates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('yields default 390 when doc is missing', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => false });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeExchangeRates(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({ usdToAmd: 390 });
  });

  test('yields stored rate when valid', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ usdToAmd: 400 }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeExchangeRates(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({ usdToAmd: 400 });
  });

  test('falls back to default when usdToAmd is negative', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ usdToAmd: -1 }) });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeExchangeRates(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith({ usdToAmd: 390 });
  });
});

describe('firestoreSettingsRepository — getWarehouseSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns defaults when doc missing', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await getWarehouseSettings();
    expect(result).toEqual({
      trackingThresholdUsd: 500,
      inventoryCodeThresholdAmd: 50000,
    });
  });

  test('returns stored value when valid', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ trackingThresholdUsd: 750, inventoryCodeThresholdAmd: 100000 }),
    });
    const result = await getWarehouseSettings();
    expect(result).toEqual({
      trackingThresholdUsd: 750,
      inventoryCodeThresholdAmd: 100000,
    });
  });
});

describe('firestoreSettingsRepository — getExchangeRates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns defaults when doc missing', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await getExchangeRates();
    expect(result).toEqual({ usdToAmd: 390 });
  });

  test('returns stored rate when valid', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ usdToAmd: 420 }),
    });
    const result = await getExchangeRates();
    expect(result).toEqual({ usdToAmd: 420 });
  });
});

describe('firestoreSettingsRepository — getCustomAssetKinds', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns [] when doc is missing', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await getCustomAssetKinds();
    expect(result).toEqual([]);
  });

  test('returns [] when doc exists but assetKinds field is absent', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ otherStuff: true }),
    });
    const result = await getCustomAssetKinds();
    expect(result).toEqual([]);
  });

  test('returns normalized kinds, dropping malformed entries', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        assetKinds: [
          { id: 'license', labels: { en: 'License', ru: 'Лицензия' }, types: ['perpetual', 'subscription'] },
          { id: '', labels: { en: 'Bad' }, types: [] },              // missing id → dropped
          { id: 'tools', labels: { en: '   ', ru: 'Инструмент' }, types: ['hammer', '   ', 42] }, // blank en stripped, non-string types dropped
          'not-an-object',                                           // dropped
          null,                                                      // dropped
        ],
      }),
    });
    const result = await getCustomAssetKinds();
    expect(result).toEqual([
      { id: 'license', labels: { en: 'License', ru: 'Лицензия' }, types: ['perpetual', 'subscription'] },
      { id: 'tools', labels: { ru: 'Инструмент' }, types: ['hammer'] },
    ]);
  });
});

describe('firestoreSettingsRepository — subscribeCustomAssetKinds', () => {
  beforeEach(() => jest.clearAllMocks());

  test('emits [] when doc is missing', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => false });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeCustomAssetKinds(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith([]);
  });

  test('emits normalized kinds on snapshot', () => {
    onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          assetKinds: [
            { id: 'merch', labels: { hy: 'Մերչ' }, types: ['mug', 'tshirt'] },
          ],
        }),
      });
      return () => {};
    });
    const onChange = jest.fn();
    subscribeCustomAssetKinds(onChange, () => {});
    expect(onChange).toHaveBeenCalledWith([
      { id: 'merch', labels: { hy: 'Մերչ' }, types: ['mug', 'tshirt'] },
    ]);
  });

  test('forwards onError', () => {
    const onError = jest.fn();
    const fakeErr = new Error('boom');
    onSnapshot.mockImplementation((_ref, _onNext, onErr) => {
      onErr(fakeErr);
      return () => {};
    });
    subscribeCustomAssetKinds(() => {}, onError);
    expect(onError).toHaveBeenCalledWith(fakeErr);
  });
});
