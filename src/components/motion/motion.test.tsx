import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Confetti } from './Confetti';

function installMatchMedia(matches: boolean) {
  const mediaQueryList = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
  vi.useRealTimers();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

describe('Confetti', () => {
  it('renders nothing under reduced motion', () => {
    installMatchMedia(true);

    const { container } = render(<Confetti fire={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders 24 aria-hidden pieces when motion is allowed', () => {
    installMatchMedia(false);

    const { container } = render(<Confetti fire={1} />);

    expect(container.querySelectorAll('.confetti__piece')).toHaveLength(24);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
