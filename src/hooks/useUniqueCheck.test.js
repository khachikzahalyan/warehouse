import { renderHook, act } from '@testing-library/react';
import { useUniqueCheck } from './useUniqueCheck';

jest.useFakeTimers();

test('debounces and reports unique', async () => {
  const checker = jest
    .fn()
    .mockResolvedValue({ unique: true, conflictId: null, conflictName: null });
  const { result, rerender } = renderHook(({ v }) => useUniqueCheck(v, checker), {
    initialProps: { v: '' },
  });

  expect(result.current.status).toBe('idle');

  rerender({ v: 'A' });
  expect(result.current.status).toBe('checking');
  // Within debounce window — should not have called yet.
  expect(checker).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(checker).toHaveBeenCalledWith('A', undefined);
  expect(result.current.status).toBe('unique');
});

test('reports conflict', async () => {
  const checker = jest
    .fn()
    .mockResolvedValue({ unique: false, conflictId: 'x', conflictName: 'Old' });
  const { result, rerender } = renderHook(({ v }) => useUniqueCheck(v, checker), {
    initialProps: { v: '' },
  });
  rerender({ v: 'B' });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(result.current.status).toBe('conflict');
  expect(result.current.conflictName).toBe('Old');
});

test('resets to idle when value is cleared', () => {
  const checker = jest.fn();
  const { result, rerender } = renderHook(({ v }) => useUniqueCheck(v, checker), {
    initialProps: { v: 'ABC' },
  });
  rerender({ v: '' });
  expect(result.current.status).toBe('idle');
  expect(checker).not.toHaveBeenCalled();
});
