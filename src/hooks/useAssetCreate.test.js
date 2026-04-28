import { renderHook, act } from '@testing-library/react';
import { useAssetCreate } from './useAssetCreate';

beforeEach(() => jest.clearAllMocks());

test('happy path resolves with repo id and clears error state', async () => {
  const fakeRepo = { create: jest.fn().mockResolvedValue('new-id') };
  const { result } = renderHook(() => useAssetCreate(fakeRepo));

  // Capture the promise directly before act wraps state.
  const p = result.current.create({ sku: 'X' });

  // Flush all state updates.
  await act(() => p.then(() => {}));

  // The promise itself returns the id.
  await expect(p).resolves.toBe('new-id');
  expect(result.current.error).toBeNull();
  expect(result.current.submitting).toBe(false);
});

test('error path surfaces error on result.current', async () => {
  const failing = { create: jest.fn().mockRejectedValue(new Error('boom')) };
  const { result } = renderHook(() => useAssetCreate(failing));

  const p = result.current.create({ sku: 'X' });

  await act(async () => {
    try {
      await p;
    } catch {
      /* expected */
    }
  });

  expect(result.current.error?.message).toBe('boom');
  expect(result.current.submitting).toBe(false);
});
