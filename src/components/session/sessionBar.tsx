import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export interface SessionExitConfirm {
  title: string;
  message: string;
}

export interface SessionBarConfig {
  value: number;
  max: number;
  exitTo: string;
  confirmExit?: SessionExitConfirm | null;
}

export interface SessionBarState {
  value: number;
  max: number;
  exitTo: string;
  confirmExit: SessionExitConfirm | null;
}

const DEFAULT_STATE: SessionBarState = {
  value: 0,
  max: 1,
  exitTo: '/',
  confirmExit: null,
};

interface SessionBarContextValue {
  state: SessionBarState;
  setState: (state: SessionBarState) => void;
}

const SessionBarContext = createContext<SessionBarContextValue | null>(null);

export function SessionBarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionBarState>(DEFAULT_STATE);
  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <SessionBarContext.Provider value={value}>
      {children}
    </SessionBarContext.Provider>
  );
}

/**
 * Reports the active session to the surrounding layout. Without a provider it
 * is a safe no-op, so isolated component tests keep working.
 */
export function useSessionBar({
  value,
  max,
  exitTo,
  confirmExit,
}: SessionBarConfig): void {
  const context = useContext(SessionBarContext);
  const setState = context?.setState;
  const confirmTitle = confirmExit?.title ?? null;
  const confirmMessage = confirmExit?.message ?? null;

  useEffect(() => {
    if (!setState) return;

    setState({
      value,
      max,
      exitTo,
      confirmExit:
        confirmTitle !== null && confirmMessage !== null
          ? { title: confirmTitle, message: confirmMessage }
          : null,
    });
  }, [confirmMessage, confirmTitle, exitTo, max, setState, value]);
}

export function useSessionBarState(): SessionBarState {
  return useContext(SessionBarContext)?.state ?? DEFAULT_STATE;
}
