import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAVE_KEY, type StorageLike } from '../storage';
import {
  THEME_KEY,
  readTheme,
  setTheme,
  toggleTheme,
} from './theme';

function storeWith(entries: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(entries));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

// Same computed lookup as the app: direct localStorage access is linted to src/lib/storage.
const browserStorage = (): Storage =>
  (globalThis as { localStorage: Storage }).localStorage;

afterEach(() => {
  browserStorage().clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe('theme', () => {
  it('reads diw-theme', () => {
    expect(readTheme(storeWith({ [THEME_KEY]: 'light' }), false)).toBe('light');
    expect(readTheme(storeWith({ [THEME_KEY]: 'dark' }), true)).toBe('dark');
  });

  it('falls back to prefers-color-scheme', () => {
    expect(readTheme(storeWith(), true)).toBe('light');
    expect(readTheme(storeWith(), false)).toBe('dark');
    expect(readTheme(storeWith({ [THEME_KEY]: 'azul' }), true)).toBe('light');
  });

  it('survives storage throwing', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(readTheme(broken, true)).toBe('light');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });
    expect(() => setTheme('light')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('never writes the save key', () => {
    setTheme('light');
    toggleTheme();

    expect(browserStorage().getItem(THEME_KEY)).toBe('dark');
    expect(browserStorage().getItem(SAVE_KEY)).toBeNull();
  });
});
