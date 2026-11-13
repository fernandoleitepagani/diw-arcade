import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { SessionSummary } from './SessionSummary';
import {
  SessionBarProvider,
  useSessionBar,
  useSessionBarState,
} from './sessionBar';

function DialogHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir diálogo
      </button>
      <Dialog
        open={open}
        title="Sair da rodada?"
        onClose={() => setOpen(false)}
      >
        <button type="button">Continuar rodada</button>
        <button type="button">Sair</button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('traps Tab, closes on Esc and restores focus', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Abrir diálogo' });
    await user.click(trigger);

    const first = screen.getByRole('button', { name: 'Continuar rodada' });
    const last = screen.getByRole('button', { name: 'Sair' });
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it('renders nothing while closed', () => {
    render(
      <Dialog open={false} title="Fechado" onClose={() => {}}>
        <p>Conteúdo</p>
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('calls onConfirm and onCancel from its buttons', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Sair da rodada?"
        message="O progresso desta rodada será perdido."
        confirmLabel="Sair"
        cancelLabel="Continuar rodada"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(
      screen.getByText('O progresso desta rodada será perdido.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Continuar rodada' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('SessionSummary', () => {
  const next = { label: 'Revisar 3 cartas', href: '/revisao' };

  function renderSummary(extra: Record<string, unknown> = {}) {
    return render(
      <MemoryRouter>
        <SessionSummary
          title="Rodada concluída"
          xp={30}
          stats={[
            { label: 'Acertos de primeira', value: '2 de 2 (100%)' },
            { label: 'Precisão', value: '100%' },
          ]}
          next={next}
          secondary={<button type="button">Nova rodada</button>}
          {...extra}
        />
      </MemoryRouter>,
    );
  }

  it('renders title, plain XP, stats and a single primary link from the selector', () => {
    renderSummary();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Rodada concluída' }),
    ).toBeInTheDocument();
    expect(screen.getByText('+30 XP')).toBeInTheDocument();
    expect(screen.getByText('2 de 2 (100%)')).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Revisar 3 cartas');
    expect(links[0]).toHaveAttribute('href', '/revisao');
    expect(links[0]).toHaveClass('primary');
    expect(screen.getByRole('button', { name: 'Nova rodada' })).toBeInTheDocument();
  });

  it('omits the stars block when starsAfter is absent', () => {
    renderSummary();
    expect(screen.queryByText('Estrelas conquistadas')).not.toBeInTheDocument();
  });

  it('shows stars when starsAfter is given', () => {
    renderSummary({
      starsBefore: { quiz: false, cards: false, code: false },
      starsAfter: { quiz: true, cards: false, code: false },
    });
    expect(
      screen.getByRole('img', { name: 'Estrelas conquistadas: quiz' }),
    ).toBeInTheDocument();
  });
});

function SessionBarWrapper({ children }: { children: ReactNode }) {
  return <SessionBarProvider>{children}</SessionBarProvider>;
}

describe('session bar', () => {
  it('does not throw when useSessionBar is called outside a provider', () => {
    expect(() =>
      renderHook(() =>
        useSessionBar({ value: 1, max: 3, exitTo: '/no/n01' }),
      ),
    ).not.toThrow();
  });

  it('shares the session bar state with the layout', async () => {
    const { result } = renderHook(
      () => {
        useSessionBar({
          value: 2,
          max: 10,
          exitTo: '/no/n07',
          confirmExit: {
            title: 'Sair da rodada?',
            message: 'O progresso desta rodada será perdido.',
          },
        });
        return useSessionBarState();
      },
      { wrapper: SessionBarWrapper },
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        value: 2,
        max: 10,
        exitTo: '/no/n07',
        confirmExit: {
          title: 'Sair da rodada?',
          message: 'O progresso desta rodada será perdido.',
        },
      }),
    );
  });
});
