import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aurora } from './Aurora/Aurora';
import { ClickSpark } from './ClickSpark/ClickSpark';
import { ShinyText } from './ShinyText/ShinyText';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(matches: boolean) {
  const listeners = new Set<ChangeListener>();
  const state = { matches };

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
}

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

function renderSparkButton() {
  return render(
    <ClickSpark>
      <button type="button">Disparar</button>
    </ClickSpark>,
  );
}

describe('effects under reduced motion', () => {
  it('renders no sparks and marks the click spark off', () => {
    installMatchMedia(true);
    const { container } = renderSparkButton();

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-motion', 'off');

    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));

    expect(container.querySelectorAll('[data-spark]')).toHaveLength(0);
  });

  it('makes aurora decorative and static while keeping shiny text', () => {
    installMatchMedia(true);
    const { container } = render(
      <>
        <Aurora />
        <ShinyText>Praticar agora</ShinyText>
      </>,
    );

    const aurora = container.querySelector('.aurora');
    expect(aurora).toHaveAttribute('aria-hidden', 'true');
    expect(aurora).toHaveAttribute('data-motion', 'off');

    const shiny = screen.getByText('Praticar agora');
    expect(shiny).toBeInTheDocument();
    expect(shiny).toHaveAttribute('data-motion', 'off');
  });
});

describe('effects with normal motion', () => {
  it('emits eight sparks that disappear after 400 ms', () => {
    installMatchMedia(false);
    vi.useFakeTimers();
    const { container } = renderSparkButton();

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-motion', 'on');

    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }));

    expect(container.querySelectorAll('[data-spark]')).toHaveLength(8);

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(container.querySelectorAll('[data-spark]')).toHaveLength(8);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.querySelectorAll('[data-spark]')).toHaveLength(0);
  });

  it('keeps the shiny text readable', () => {
    installMatchMedia(false);
    render(<ShinyText>XP dobrado</ShinyText>);

    expect(screen.getByText('XP dobrado')).toBeInTheDocument();
  });

  it('renders aurora as decorative', () => {
    const { container } = render(<Aurora />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
