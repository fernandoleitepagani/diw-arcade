import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SAVE_KEY, type SaveV1 } from '../../lib/storage';
import { renderWithProgress } from '../../test/renderWithProgress';
import { NodePage } from '../tree/NodePage';

vi.mock('../../content/primers', () => ({
  hasPrimer: (id: string) => id === 'n09',
  getPrimer: async (id: string) => ({
    nodeId: id,
    points: [
      {
        title: 'Flexbox organiza em uma dimensão',
        body: 'Declare `display: flex` no contêiner.',
        code: { lang: 'css', text: '.menu {\n  display: flex;\n}', caption: 'menu.css' },
        source: { aula: 174, slide: 3 },
        evidence: 'x',
      },
      {
        title: 'O eixo principal manda',
        body: 'Corpo dois.',
        source: { aula: 174, slide: 5 },
        evidence: 'x',
      },
    ],
  }),
}));

function renderLer() {
  return renderWithProgress(
    <Routes>
      <Route path="/no/:nodeId" element={<NodePage />} />
    </Routes>,
    { route: '/no/n09?passo=ler' },
  );
}

describe('Ler layout (?passo=ler)', () => {
  it('puts the stepper above the h1, with numbered points and Fonte lines', async () => {
    renderLer();
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Flexbox e Grid' });
    const stepper = screen.getByRole('list', { name: 'Passos da lição' });
    expect(
      stepper.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Flexbox e Grid' })).toHaveAttribute(
      'href',
      '/no/n09',
    );
    // once in the stepper tile, once in the meta line
    expect(screen.getAllByText('2 pontos')).toHaveLength(2);
    expect(screen.getByText(/^cerca de \d+ minutos?$/)).toBeInTheDocument();
    const points = screen.getAllByRole('listitem').filter((li) => li.matches('.primer__point'));
    expect(points).toHaveLength(2);
    expect(within(points[0]!).getByText('Fonte: aula 174, slide 3')).toBeInTheDocument();
    expect(within(points[0]!).getByText('menu.css')).toBeInTheDocument();
  });

  it('Concluir leitura still dispatches primer/read', async () => {
    const user = userEvent.setup();
    const { storage } = renderLer();
    await user.click(await screen.findByRole('button', { name: 'Concluir leitura' }));
    const saved = JSON.parse(storage.getItem(SAVE_KEY) ?? '{}') as SaveV1;
    expect(saved.primersRead.n09).toBeDefined();
    expect(screen.getByRole('link', { name: 'Continuar para o quiz' })).toHaveAttribute(
      'href',
      '/no/n09/quiz',
    );
  });
});
