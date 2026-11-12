import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { REPO_URL_PREFIX, getLabs } from '../../content';
import { pickLine } from '../../content/copy';
import { loadSave, type StorageLike } from '../../lib/storage';
import { fixtureLab } from '../../test/fixtures';
import { FIXED_NOW, renderWithProgress } from '../../test/renderWithProgress';
import { LabGuidePage } from './LabGuidePage';
import { LabsPage } from './LabsPage';

/** The fixture clock always falls on the same local calendar day. */
const TODAY = '2026-01-05';

function saved(storage: StorageLike) {
  return loadSave(storage, FIXED_NOW).save;
}

describe('LabsPage', () => {
  it('shows the four guides with their step counts', () => {
    renderWithProgress(<LabsPage />);

    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getAllByText(/^0 de \d+ passos$/)).toHaveLength(4);
  });

  it('counts the completed steps from the save', () => {
    renderWithProgress(<LabsPage labs={[fixtureLab]} />, {
      save: {
        labs: {
          'lab-01': { estrutura: { done: true, xpAwarded: true } },
        },
      },
    });

    expect(screen.getByText('1 de 5 passos')).toBeInTheDocument();
  });

  it('gives each lab card a progress ring named after the lab', () => {
    renderWithProgress(<LabsPage />);

    for (const lab of getLabs()) {
      const ring = screen.getByRole('progressbar', {
        name: `Passos concluídos de ${lab.title}`,
      });
      expect(ring).toHaveAttribute('aria-valuenow', '0');
      expect(ring).toHaveAttribute('aria-valuemax', String(lab.steps.length));
    }
  });

  it('shows the empty state with a Bit line when there are no guides', () => {
    renderWithProgress(<LabsPage labs={[]} />);

    expect(screen.getByText('Conteúdo em breve')).toBeInTheDocument();
    expect(screen.getByText(pickLine('empty', 0))).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Bit, o robô mascote' }),
    ).toBeInTheDocument();
  });
});

describe('LabGuidePage', () => {
  it('renders the rubric with slide citations', () => {
    renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    expect(
      screen.getByRole('heading', { name: 'Requisitos do laboratório' }),
    ).toBeInTheDocument();
    for (const requirement of fixtureLab.requirements) {
      expect(screen.getByText(requirement.text)).toBeInTheDocument();
    }
    expect(
      screen.getAllByText('Fonte: laboratório 1, slide 2'),
    ).toHaveLength(fixtureLab.requirements.length);
  });

  it('renders the HTML, CSS and JS structure tips', () => {
    renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    expect(
      screen.getByRole('heading', { name: 'Dicas de estrutura' }),
    ).toBeInTheDocument();

    const tips = [
      ['HTML', fixtureLab.tips.html],
      ['CSS', fixtureLab.tips.css],
      ['JS', fixtureLab.tips.js],
    ] as const;

    for (const [title, lines] of tips) {
      expect(
        screen.getByRole('heading', { level: 3, name: title }),
      ).toBeInTheDocument();
      for (const line of lines) {
        expect(screen.getByText(line)).toBeInTheDocument();
      }
    }
  });

  it('groups the rubric and structure tips in a named complementary region', () => {
    renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    const aside = screen.getByRole('complementary', {
      name: 'Rubrica e dicas',
    });

    expect(
      within(aside).getByRole('heading', {
        name: 'Requisitos do laboratório',
      }),
    ).toBeInTheDocument();
    expect(
      within(aside).getByRole('heading', { name: 'Dicas de estrutura' }),
    ).toBeInTheDocument();
    expect(
      within(aside).getByText(fixtureLab.requirements[0]!.text),
    ).toBeInTheDocument();
    expect(
      within(aside).getByRole('heading', { level: 3, name: 'HTML' }),
    ).toBeInTheDocument();
  });

  it('renders the numbered steps with copied code and checkboxes', () => {
    renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(fixtureLab.steps.length);
    expect(screen.getAllByRole('button', { name: 'Copiar' })).toHaveLength(3);
    for (const step of fixtureLab.steps) {
      expect(
        screen.getByRole('heading', { level: 3, name: step.title }),
      ).toBeInTheDocument();
    }
  });

  it('grants 3 XP when the first step is checked and persists it', async () => {
    const user = userEvent.setup();
    const { storage } = renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    const [first] = screen.getAllByRole('checkbox');
    expect(first).toHaveAccessibleName('Concluí este passo (+3 XP)');

    await user.click(first!);

    expect(first).toBeChecked();
    expect(
      screen.getByText('Concluí este passo (XP já recebido)'),
    ).toBeInTheDocument();

    const save = saved(storage);
    expect(save.xpTotal).toBe(3);
    expect(save.days[TODAY]?.labs).toBe(1);
    expect(save.labs['lab-01']?.['estrutura']).toEqual({
      done: true,
      xpAwarded: true,
    });
  });

  it('keeps XP unchanged after unchecking and re-checking', async () => {
    const user = userEvent.setup();
    const { storage } = renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    const [first] = screen.getAllByRole('checkbox');

    await user.click(first!);
    await user.click(first!);

    expect(first).not.toBeChecked();
    expect(saved(storage).xpTotal).toBe(3);
    expect(saved(storage).labs['lab-01']?.['estrutura']).toEqual({
      done: false,
      xpAwarded: true,
    });

    await user.click(first!);

    expect(first).toBeChecked();
    expect(saved(storage).xpTotal).toBe(3);
    expect(saved(storage).labs['lab-01']?.['estrutura']).toEqual({
      done: true,
      xpAwarded: true,
    });
  });

  it('links each repo path into the professor repository in a new tab', () => {
    renderWithProgress(<LabGuidePage lab={fixtureLab} />);

    const htmlLink = screen.getByRole('link', {
      name: 'LABORATORIOS/LAB01/index.html',
    });
    expect(htmlLink).toHaveAttribute(
      'href',
      `${REPO_URL_PREFIX}/tree/main/LABORATORIOS/LAB01/index.html`,
    );
    expect(htmlLink).toHaveAttribute('target', '_blank');
    expect(htmlLink).toHaveAttribute('rel', 'noopener noreferrer');

    const cssLink = screen.getByRole('link', {
      name: 'LABORATORIOS/LAB01/style.css',
    });
    expect(cssLink).toHaveAttribute(
      'href',
      `${REPO_URL_PREFIX}/tree/main/LABORATORIOS/LAB01/style.css`,
    );
  });

  it('shows the not-found message for an unknown lab id', () => {
    renderWithProgress(
      <Routes>
        <Route path="/laboratorios/:labId" element={<LabGuidePage />} />
      </Routes>,
      { initialEntries: ['/laboratorios/nao-existe'] },
    );

    expect(screen.getByText('Guia não encontrado')).toBeInTheDocument();
  });
});
