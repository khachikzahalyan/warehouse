import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const UNDO_DURATION_MS = 5000;

/**
 * A floating undo notification rendered via a portal.
 * The kit Toast has no "action" or "duration" support, so we render our own
 * minimal portal element styled to match the Toast surface.
 *
 * @param {{
 *   message: string,
 *   undoLabel: string,
 *   onUndo: () => void,
 *   onDismiss: () => void,
 * }} props
 */
function UndoToastPortal({ message, undoLabel, onUndo, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / UNDO_DURATION_MS) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onDismiss]);

  return createPortal(
    <div className="undo-toast" role="status" aria-live="polite">
      <div className="undo-toast__progress" style={{ width: `${progress}%` }} />
      <div className="undo-toast__content">
        <span className="undo-toast__message">{message}</span>
        <button
          type="button"
          className="undo-toast__btn"
          onClick={() => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            onUndo();
            onDismiss();
          }}
        >
          {undoLabel}
        </button>
        <button
          type="button"
          className="undo-toast__close"
          aria-label="Dismiss"
          onClick={() => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            onDismiss();
          }}
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Hook that surfaces an undoable-create notification.
 *
 * Usage:
 *   const { notifySuccess, toastNode } = useUndoableCreate();
 *   // … in JSX: {toastNode}
 *   // … on create success: notifySuccess(asset, () => repo.delete(asset.id));
 *
 * @param {{ createdLabel: string, undoLabel: string }} labels
 * @returns {{ notifySuccess: (asset: any, undoFn: () => Promise<void>) => void, toastNode: React.ReactNode }}
 */
export function useUndoableCreate({ createdLabel, undoLabel }) {
  const [toast, setToast] = useState(null);

  const notifySuccess = useCallback(
    (asset, undoFn) => {
      setToast({ asset, undoFn });
    },
    [],
  );

  const toastNode = toast ? (
    <UndoToastPortal
      message={createdLabel}
      undoLabel={undoLabel}
      onUndo={async () => {
        try {
          await toast.undoFn();
        } catch {
          // Best-effort undo; UI failure is non-blocking.
        }
      }}
      onDismiss={() => setToast(null)}
    />
  ) : null;

  return { notifySuccess, toastNode };
}
