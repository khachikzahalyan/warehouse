import { renderHook, act } from '@testing-library/react';
import { useStorageAssets } from './useStorageAssets';

test('subscribes and yields assets', () => {
  const unsubscribe = jest.fn();
  let pushed;
  const repo = {
    subscribeStorage: (_filter, onChange) => {
      pushed = onChange;
      return unsubscribe;
    },
  };
  const { result, unmount } = renderHook(() => useStorageAssets(repo));
  expect(result.current.loading).toBe(true);
  act(() => pushed([{ id: 'a', name: 'Mouse' }]));
  expect(result.current.loading).toBe(false);
  expect(result.current.assets).toEqual([{ id: 'a', name: 'Mouse' }]);
  unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

test('surfaces error state', () => {
  let pushError;
  const repo = {
    subscribeStorage: (_filter, _onChange, onError) => {
      pushError = onError;
      return () => {};
    },
  };
  const { result } = renderHook(() => useStorageAssets(repo));
  act(() => pushError(new Error('Network error')));
  expect(result.current.loading).toBe(false);
  expect(result.current.error?.message).toBe('Network error');
});
