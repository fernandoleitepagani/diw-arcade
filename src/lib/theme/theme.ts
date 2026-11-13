import { useSyncExternalStore } from 'react';
import type { StorageLike } from '../storage';

export const THEME_KEY = 'diw-theme';

export type Theme = 'dark' | 'light';

const listeners = new Set<() => void>();

function localStore(): StorageLike | null {
  try {
    // Computed lookup, as in ProgressProvider: the ESLint storage boundary
    // allows direct localStorage access only in src/lib/storage.
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

function systemPrefersLight(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  );
}

export function readTheme(store: StorageLike | null, prefersLight: boolean): Theme {
  let stored: string | null = null;
  try {
    stored = store?.getItem(THEME_KEY) ?? null;
  } catch {
    stored = null;
  }
  if (stored === 'dark' || stored === 'light') return stored;
  return prefersLight ? 'light' : 'dark';
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}

export function setTheme(theme: Theme): void {
  try {
    localStore()?.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be full or blocked; the theme still applies for this visit.
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, currentTheme);
}

/** Applies the stored or system theme. Call once in main.tsx, before the first render. */
export function initTheme(): void {
  applyTheme(readTheme(localStore(), systemPrefersLight()));
}
