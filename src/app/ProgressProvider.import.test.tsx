import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/ui/Toast/Toast';
import type { ProgressContent } from '../lib/progress/events';
import { newCard } from '../lib/srs/fsrs';
import {
  createEmptySave,
  persistSave,
  type SaveV1,
  type StorageLike,
} from '../lib/storage';
import { ProgressProvider, useProgress } from './ProgressProvider';

const NOW = new Date('2026-01-05T12:00:00.000Z');

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const UNIT_CONTENT: ProgressContent = {
  questions: { n01: [{ id: 'n01-q001' }], n02: [{ id: 'n02-q001' }] },
  flashcards: { n01: [{ id: 'n01-f001' }], n02: [{ id: 'n02-f001' }] },
  challenges: { n01: [{ id: 'n01-c01' }], n02: [{ id: 'n02-c01' }] },
};

function completeNode(
  save: SaveV1,
  nodeId: 'n01' | 'n02',
  cardId: string,
  challengeId: string,
): void {
  save.quiz.rounds[nodeId] = { best: 100, count: 1, perfect: true };
  save.cards[cardId] = { ...newCard(NOW), reps: 1, state: 2 };
  save.challenges[challengeId] = {
    passed: true,
    failedRuns: 0,
    hintsUsed: 0,
    xpAwarded: 30,
    code: null,
  };
}

/** A save whose first unit (n01 + n02) already has all three stars. */
function completedUnitSave(): SaveV1 {
  const save = createEmptySave(NOW);
  save.onboarded = true;
  completeNode(save, 'n01', 'n01-f001', 'n01-c01');
  completeNode(save, 'n02', 'n02-f001', 'n02-c01');
  return save;
}

/** First unit complete except for the n02 quiz star. */
function unitShortOfQuizStar(): SaveV1 {
  const save = createEmptySave(NOW);
  save.onboarded = true;
  completeNode(save, 'n01', 'n01-f001', 'n01-c01');
  save.cards['n02-f001'] = { ...newCard(NOW), reps: 1, state: 2 };
  save.challenges['n02-c01'] = {
    passed: true,
    failedRuns: 0,
    hintsUsed: 0,
    xpAwarded: 30,
    code: null,
  };
  return save;
}

function ImportProbe({ imported }: { imported: SaveV1 }) {
  const { dispatch } = useProgress();

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'save/replace', save: imported })}
    >
      Importar progresso
    </button>
  );
}

function QuizProbe() {
  const { dispatch } = useProgress();

  return (
    <button
      type="button"
      onClick={() =>
        dispatch({
          type: 'quiz/roundComplete',
          nodeId: 'n02',
          total: 10,
          firstTryCorrect: 10,
        })
      }
    >
      Concluir quiz da unidade
    </button>
  );
}

function renderProvider(storage: StorageLike, child: ReactNode) {
  return render(
    <ToastProvider>
      <ProgressProvider
        storage={storage}
        clock={() => NOW}
        contentIndex={UNIT_CONTENT}
      >
        {child}
      </ProgressProvider>
    </ToastProvider>,
  );
}

describe('ProgressProvider save import', () => {
  it('does not celebrate a unit already complete in an imported save', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, createEmptySave(NOW));
    renderProvider(storage, <ImportProbe imported={completedUnitSave()} />);

    await user.click(screen.getByRole('button', { name: 'Importar progresso' }));

    expect(
      screen.queryByText('Unidade concluída: Fundamentos da Web'),
    ).not.toBeInTheDocument();
  });

  it('still celebrates a unit completed by a real quiz event exactly once', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, unitShortOfQuizStar());
    renderProvider(storage, <QuizProbe />);

    await user.click(
      screen.getByRole('button', { name: 'Concluir quiz da unidade' }),
    );

    expect(
      screen.getAllByText('Unidade concluída: Fundamentos da Web'),
    ).toHaveLength(1);
  });
});
