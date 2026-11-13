import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  PageHeader,
  Skeleton,
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

describe('PageHeader', () => {
  it('renders exactly one h1', () => {
    render(
      <PageHeader
        eyebrow="Unidade 1"
        title="Fundamentos"
        description="Comece por aqui."
        actions={<Button>Jogar</Button>}
      />,
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Fundamentos' }),
    ).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('announces loading with aria-busy and a label', () => {
    render(<Skeleton />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Carregando…');
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
