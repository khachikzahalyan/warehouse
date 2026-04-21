import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

const ToastContext = createContext(null);

let _nextId = 0;
const newId = () => `t${++_nextId}`;

/**
 * Provide the toast surface. Put once near the app root (above routes).
 *
 * Usage in a component:
 *   const toast = useToast();
 *   toast.success('Saved');
 *   toast.error('Network error');
 *
 * @param {{ children?: React.ReactNode, duration?: number }} props
 */
export function ToastProvider({ children, duration = 4000 }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const h = timers.current.get(id);
    if (h) {
      clearTimeout(h);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, message, opts) => {
      const id = opts?.id || newId();
      const dur = opts?.duration ?? duration;
      setToasts((list) => [...list, { id, variant, message }]);
      if (dur > 0) {
        const h = setTimeout(() => dismiss(id), dur);
        timers.current.set(id, h);
      }
      return id;
    },
    [dismiss, duration]
  );

  // Snapshot timers.current into a local for cleanup so React-hooks/exhaustive-deps is happy.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((h) => clearTimeout(h));
      map.clear();
    };
  }, []);

  const api = useMemo(
    () => ({
      show: (message, opts) => push(opts?.variant || 'info', message, opts),
      success: (message, opts) => push('success', message, opts),
      error: (message, opts) => push('error', message, opts),
      info: (message, opts) => push('info', message, opts),
      warning: (message, opts) => push('warning', message, opts),
      dismiss,
    }),
    [push, dismiss]
  );

  const portalTarget =
    typeof document !== 'undefined' ? document.body : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {portalTarget &&
        createPortal(
          <div className="toast-viewport" role="region" aria-label="Notifications">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast toast--${t.variant}`}
                role={t.variant === 'error' ? 'alert' : 'status'}
              >
                <span className="toast__message">{t.message}</span>
                <button
                  type="button"
                  className="toast__close"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12" />
                    <path d="M6 18L18 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>,
          portalTarget
        )}
    </ToastContext.Provider>
  );
}

/**
 * Access the toast API. Must be called from inside <ToastProvider>.
 * @returns {{
 *   show: (message: string, opts?: { variant?: 'success'|'error'|'info'|'warning', duration?: number, id?: string }) => string,
 *   success: (message: string, opts?: object) => string,
 *   error: (message: string, opts?: object) => string,
 *   info: (message: string, opts?: object) => string,
 *   warning: (message: string, opts?: object) => string,
 *   dismiss: (id: string) => void,
 * }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
