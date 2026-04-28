import { renderHook, act } from '@testing-library/react';
import { useBranches } from './useBranches';

jest.mock('../infra/repositories/firestoreDashboardRepository', () => ({
  subscribeBranchesBasic: jest.fn(),
}));

const { subscribeBranchesBasic } = require('../infra/repositories/firestoreDashboardRepository');

beforeEach(() => jest.clearAllMocks());

test('starts loading and yields branch list on first snapshot', () => {
  const unsubscribe = jest.fn();
  let pushData;
  subscribeBranchesBasic.mockImplementation((onChange) => {
    pushData = onChange;
    return unsubscribe;
  });

  const { result, unmount } = renderHook(() => useBranches());
  expect(result.current.loading).toBe(true);

  act(() => pushData([{ id: 'b-1', name: 'Main' }]));
  expect(result.current.loading).toBe(false);
  expect(result.current.branches).toEqual([{ id: 'b-1', name: 'Main' }]);

  unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

test('surfaces error', () => {
  let pushError;
  subscribeBranchesBasic.mockImplementation((_onChange, onError) => {
    pushError = onError;
    return () => {};
  });

  const { result } = renderHook(() => useBranches());
  act(() => pushError(new Error('Permission denied')));
  expect(result.current.loading).toBe(false);
  expect(result.current.error?.message).toBe('Permission denied');
});
