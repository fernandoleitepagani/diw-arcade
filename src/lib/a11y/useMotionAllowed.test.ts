import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMotionAllowed } from './useMotionAllowed';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(matches: boolean) {
  const listeners = new Set<ChangeListener>();
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      listeners.add(listener as ChangeListener);
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      listeners.delete(listener as ChangeListener);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  } as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mediaQueryList),
  });
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

describe('useMotionAllowed', () => {
  it('returns false when matchMedia is unavailable', () => {
    const { result } = renderHook(() => useMotionAllowed());

    expect(result.current).toBe(false);
  });

  it('returns true when the user has no motion preference', () => {
    installMatchMedia(false);

    const { result } = renderHook(() => useMotionAllowed());

    expect(result.current).toBe(true);
  });

  it('returns false when the user prefers reduced motion', () => {
    installMatchMedia(true);

    const { result } = renderHook(() => useMotionAllowed());

    expect(result.current).toBe(false);
  });
});
