import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import './Toast.css';

export type ToastTone = 'info' | 'success' | 'warning' | 'reward' | 'danger';

export interface ToastOptions {
  tone?: ToastTone;
  duration?: number;
}

export interface ToastItem {
  id: string;
  message: ReactNode;
  tone: ToastTone;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: ReactNode, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4_000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: ReactNode, options: ToastOptions = {}) => {
      const id = `toast-${++nextId.current}`;
      const toast: ToastItem = {
        id,
        message,
        tone: options.tone ?? 'info',
      };

      setToasts((current) => [...current, toast].slice(-MAX_TOASTS));

      const duration = options.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" role="status">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`ui-toast ui-toast--${toast.tone}`}
          >
            <span className="ui-toast__message">{toast.message}</span>
            <button
              type="button"
              className="ui-toast__close"
              aria-label="Fechar aviso"
              onClick={() => dismissToast(toast.id)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return context;
}
