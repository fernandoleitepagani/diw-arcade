import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LAB_IDS, UNITS, getLab } from '../../content';
import { LAB_UNIT } from '../tree/projects';
import { NodePage } from '../tree/NodePage';
import { renderWithProgress } from '../../test/renderWithProgress';

function renderConstruir(nodeId: string, save = {}) {
  return renderWithProgress(
    <Routes>
      <Route path="/no/:nodeId" element={<NodePage />} />
    </Routes>,
    { route: `/no/${nodeId}?passo=construir`, save },
  );
}

describe('labs in Construir (AC8)', () => {
  it.each(LAB_IDS)('%s is linked from Construir of every node in its unit', (labId) => {
    const unit = UNITS.find((u) => u.id === LAB_UNIT[labId])!;
    for (const nodeId of unit.nodes) {
      const { unmount } = renderConstruir(nodeId);
      const links = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href') === `/laboratorios/${labId}`);
      expect(links, `${labId} on ${nodeId}`).toHaveLength(1);
      unmount();
    }
  });

  it('does not list labs of other units', () => {
    renderConstruir('n01');
    const labLinks = screen
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/laboratorios/'));
    expect(labLinks).toHaveLength(0);
  });

  it('shows each lab with its status', () => {
    const lab = getLab('lab-01')!;
    renderConstruir('n09', {
      labs: { 'lab-01': { [lab.steps[0]!.id]: { done: true, xpAwarded: true } } },
    });
    expect(screen.getByRole('heading', { name: 'Projetos da unidade' })).toBeInTheDocument();
    const link = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/laboratorios/lab-01')!;
    const row = link.closest('.row') as HTMLElement;
    expect(within(row).getByText(lab.title)).toBeInTheDocument();
    expect(within(row).getByText(`1 de ${lab.steps.length} passos`)).toBeInTheDocument();
  });
});
