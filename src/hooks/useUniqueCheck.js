import { useEffect, useRef, useState } from 'react';

/**
 * Debounced (300 ms) uniqueness probe.
 *
 * Returns idle when value is empty. Transitions to checking immediately on
 * a non-empty value, then resolves to unique/conflict/error after 300 ms.
 * In-flight checks are cancelled when the value changes.
 *
 * @param {string} value
 * @param {(v: string, exceptId?: string) => Promise<{ unique: boolean, conflictId: string | null, conflictName: string | null }>} checker
 * @param {string} [exceptId]  Exclude a specific doc from the conflict check (for edit mode).
 * @returns {{ status: 'idle' | 'checking' | 'unique' | 'conflict' | 'error', conflictId: string | null, conflictName: string | null, error: Error | null }}
 */
export function useUniqueCheck(value, checker, exceptId) {
  const [state, setState] = useState({
    status: 'idle',
    conflictId: null,
    conflictName: null,
    error: null,
  });
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!value || value.trim() === '') {
      setState({ status: 'idle', conflictId: null, conflictName: null, error: null });
      return undefined;
    }

    // Move to checking immediately so the UI can disable Save right away.
    setState((s) => ({ ...s, status: 'checking', error: null }));

    const myReqId = ++reqIdRef.current;

    const handle = setTimeout(async () => {
      try {
        const result = await checker(value, exceptId);
        if (reqIdRef.current !== myReqId) return; // stale
        setState({
          status: result.unique ? 'unique' : 'conflict',
          conflictId: result.conflictId,
          conflictName: result.conflictName,
          error: null,
        });
      } catch (err) {
        if (reqIdRef.current !== myReqId) return;
        setState({ status: 'error', conflictId: null, conflictName: null, error: err });
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [value, checker, exceptId]);

  return state;
}
