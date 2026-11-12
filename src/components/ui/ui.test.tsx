import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  Mascot,
  Panel,
  ProgressBar,
  StarRating,
  ToastProvider,
  useToast,
} from './index';

describe('Button', () => {
  it('defaults to type="button"', () => {
    render(<Button>Jogar</Button>);

    expect(screen.getByRole('button', { name: 'Jogar' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('keeps an explicit submit type', () => {
    render(<Button type="submit">Enviar</Button>);

    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute(
      'type',
      'submit',
    );
  });

  it('activates with the keyboard', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Jogar</Button>);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Jogar' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Panel', () => {
  it('renders its contents and supports landmark semantics', () => {
    render(
      <Panel as="section" aria-label="Resumo">
        Conteúdo do painel
      </Panel>,
    );

    expect(screen.getByRole('region', { name: 'Resumo' })).toHaveTextContent(
      'Conteúdo do painel',
    );
  });
});

describe('ProgressBar', () => {
  it('exposes ARIA values and its label', () => {
    render(
      <ProgressBar label="XP para o próximo nível" value={40} max={120} />,
    );

    const bar = screen.getByRole('progressbar', {
      name: 'XP para o próximo nível',
    });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '120');
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuetext', '40 de 120');
  });

  it('clamps values to the declared range', () => {
    const { rerender } = render(
      <ProgressBar label="XP" value={150} max={100} />,
    );

    expect(screen.getByRole('progressbar', { name: 'XP' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );

    rerender(<ProgressBar label="XP" value={-20} max={100} />);
    expect(screen.getByRole('progressbar', { name: 'XP' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });
});

describe('StarRating', () => {
  it('labels which modes are complete', () => {
    render(<StarRating stars={1} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Domínio: quiz concluído, cartas pendente, código pendente',
    );
  });

  it('handles all modes complete', () => {
    render(<StarRating stars={3} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Domínio: quiz concluído, cartas concluído, código concluído',
    );
  });
});

function ToastHarness() {
  const { showToast } = useToast();
  const next = useRef(0);

  return (
    <button type="button" onClick={() => showToast(`Aviso ${++next.current}`)}>
      Mostrar aviso
    </button>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders toasts in a status region and keeps at most three', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    const region = screen.getByRole('status');
    const trigger = screen.getByRole('button', { name: 'Mostrar aviso' });

    fireEvent.click(trigger);
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(within(region).getByText('Aviso 2')).toBeInTheDocument();
    expect(within(region).getByText('Aviso 3')).toBeInTheDocument();
    expect(within(region).getByText('Aviso 4')).toBeInTheDocument();
    expect(within(region).queryByText('Aviso 1')).not.toBeInTheDocument();
  });

  it('auto-dismisses a toast after four seconds', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar aviso' }));
    expect(screen.getByText('Aviso 1')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_999);
    });
    expect(screen.getByText('Aviso 1')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Aviso 1')).not.toBeInTheDocument();
  });

  it('can be dismissed by the keyboard-operable close button', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar aviso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    expect(screen.queryByText('Aviso 1')).not.toBeInTheDocument();
  });
});

describe('Mascot', () => {
  it('renders Bit with an accessible name and a visible speech line', () => {
    render(<Mascot mood="happy" line="Mandou bem!" />);

    expect(
      screen.getByRole('img', { name: 'Bit, o robô mascote' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mandou bem!')).toBeVisible();
  });

  it('renders every mood without a line', () => {
    const { rerender } = render(<Mascot mood="idle" />);

    for (const mood of ['happy', 'sad', 'thinking'] as const) {
      rerender(<Mascot mood={mood} />);
      expect(
        screen.getByRole('img', { name: 'Bit, o robô mascote' }),
      ).toBeInTheDocument();
    }
  });
});
