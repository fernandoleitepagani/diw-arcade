import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/ui/Toast/Toast';
import { BIT_LINES } from '../content/copy';
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

function seededSave(xpTotal: number): SaveV1 {
  const save = createEmptySave(NOW);
  save.onboarded = true;
  save.xpTotal = xpTotal;
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
    </div>
  );
}

function renderProvider(storage: StorageLike) {
  return render(
    <ToastProvider>
      <ProgressProvider storage={storage} clock={() => NOW}>
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

  it('shows a level-up toast with a Bit line', async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    persistSave(storage, seededSave(90));
    renderProvider(storage);

    await user.click(screen.getByRole('button', { name: 'Responder' }));

    expect(screen.getByText('Nível 2!')).toBeInTheDocument();
    const showsBitLine = BIT_LINES.levelUp.some(
      (line) => screen.queryByText(line) !== null,
    );
    expect(showsBitLine).toBe(true);
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
