import { useCallback, useState } from 'react';

/**
 * Wraps repo.create with submitting/error state.
 *
 * On UniqueConstraintError (or any error), surfaces a typed error object so
 * the caller can map it to inline field errors.
 *
 * @param {{ create: (input: any) => Promise<string> }} repo
 * @returns {{ create: (input: any) => Promise<string>, submitting: boolean, error: Error | null }}
 */
export function useAssetCreate(repo) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {Error | null} */ (null));

  const create = useCallback(
    async (input) => {
      setSubmitting(true);
      setError(null);
      try {
        const id = await repo.create(input);
        return id;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [repo],
  );

  return { create, submitting, error };
}
