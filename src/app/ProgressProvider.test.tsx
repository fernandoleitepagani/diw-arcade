import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/ui/Toast/Toast';
import { BIT_LINES } from '../content/copy';
import type { ProgressContent } from '../lib/progress/events';
import { newCard } from '../lib/srs/fsrs';
import {
  SAVE_KEY,
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

function seededSave(xpTotal: number): SaveV1 {
  const save = createEmptySave(NOW);
  save.onboarded = true;
  save.xpTotal = xpTotal;
  return save;
}

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

function seededUnitSave(): SaveV1 {
  const save = seededSave(0);
  completeNode(save, 'n01', 'n01-f001', 'n01-c01');
  // n02 is one challenge short of its code star.
  save.quiz.rounds['n02'] = { best: 100, count: 1, perfect: true };
  save.cards['n02-f001'] = { ...newCard(NOW), reps: 1, state: 2 };
  return save;
}

function Probe() {
  const { save, dispatch } = useProgress();

  return (
    <div>
      <span data-testid="xp">{save.xpTotal}</span>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: 'quiz/answer',
            nodeId: 'n07',
            questionId: 'n07-q001',
            correct: true,
            firstTry: true,
          })
        }
      >
        Responder
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: 'challenge/run',
            nodeId: 'n02',
            challengeId: 'n02-c01',
            passed: true,
          })
        }
      >
        Concluir unidade
      </button>
    </div>
  );
}

function renderProvider(storage: StorageLike, contentIndex?: ProgressContent) {
  return render(
    <ToastProvider>
      <ProgressProvider
        storage={storage}
        clock={() => NOW}
        contentIndex={contentIndex}
      >
        <Probe />
      </ProgressProvider>
    </ToastProvider>,
  );
}

describe('ProgressProvider', () => {
  it('persists every dispatch', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, seededSave(0));
    renderProvider(storage);

    await user.click(screen.getByRole('button', { name: 'Responder' }));

    const raw = storage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw ?? '{}') as SaveV1;
    expect(persisted.xpTotal).toBe(15);
    expect(screen.getByTestId('xp')).toHaveTextContent('15');
  });

  it('shows the +15 XP toast', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, seededSave(0));
    renderProvider(storage);

    await user.click(screen.getByRole('button', { name: 'Responder' }));

    expect(screen.getByText('+15 XP')).toBeInTheDocument();
  });

  it('shows a level-up takeover with a Bit line and no duplicate toast', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, seededSave(90));
    renderProvider(storage);

    await user.click(screen.getByRole('button', { name: 'Responder' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Nível 2!');
    expect(screen.getByText('Nível 2!')).toBeInTheDocument();
    const showsBitLine = BIT_LINES.levelUp.some(
      (line) => screen.queryByText(line) !== null,
    );
    expect(showsBitLine).toBe(true);
    expect(screen.getAllByText('Nível 2!')).toHaveLength(1);
    expect(document.querySelector('.ui-toasts')).not.toHaveTextContent('Nível 2!');

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('celebrates a completed unit', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, seededUnitSave());
    renderProvider(storage, UNIT_CONTENT);

    await user.click(screen.getByRole('button', { name: 'Concluir unidade' }));

    expect(
      // v4: unit renamed to match prototype
      screen.getByText('Unidade concluída: Fundamentos'),
    ).toBeInTheDocument();
  });

  it('warns when the saved progress is corrupt', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{isto não é json');

    renderProvider(storage);

    expect(await screen.findByText(/corrompido/i)).toBeInTheDocument();
  });

  it('reloads the save when another tab writes it', async () => {
    const storage = new MemoryStorage();
    persistSave(storage, seededSave(0));
    renderProvider(storage);

    persistSave(storage, seededSave(42));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('xp')).toHaveTextContent('42');
    });
  });
});
