import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const state = { matches: initialMatches };

  const mediaQueryList = {
    get matches() {
      return state.matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      listeners.add(listener as ChangeListener);
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
      listeners.delete(listener as ChangeListener);
    },
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  } as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => mediaQueryList,
  });

  return {
    emit(matches: boolean) {
      state.matches = matches;
      const event = { matches, media: mediaQueryList.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

describe('useReducedMotion', () => {
  it('returns false when the user has no motion preference', () => {
    installMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('returns true when the user prefers reduced motion', () => {
    installMatchMedia(true);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('follows changes to the preference', () => {
    const media = installMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());

    act(() => media.emit(true));
    expect(result.current).toBe(true);

    act(() => media.emit(false));
    expect(result.current).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
