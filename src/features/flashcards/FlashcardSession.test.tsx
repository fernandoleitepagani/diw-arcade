import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BIT_LINES } from '../../content/copy';
import type { Flashcard } from '../../content/schema';
import { toDayKey } from '../../lib/game/days';
import { newCard, previewIntervals, type SrsCard } from '../../lib/srs/fsrs';
import { SAVE_KEY, type SaveV1 } from '../../lib/storage';
import {
  FIXED_NOW,
  createMemoryStorage,
  renderWithProgress,
} from '../../test/renderWithProgress';
import { FlashcardSession } from './FlashcardSession';

const PAST_DAY = '2026-01-04';

function makeFlashcard(index: number): Flashcard {
  const suffix = String(index).padStart(3, '0');
  return {
    id: `n07-f${suffix}`,
    nodeId: 'n07',
    front: `Pergunta ${index}?`,
    back: `Resposta ${index}.`,
    source: { aula: 172, slide: 2 },
    evidence: 'Evidência de teste com mais de vinte caracteres.',
  };
}

function dueCard(id: string, minutesAgo: number): SrsCard {
  return {
    ...newCard(FIXED_NOW),
    due: new Date(FIXED_NOW.getTime() - minutesAgo * 60_000).toISOString(),
    reps: 1,
    state: 2,
    lastReview: FIXED_NOW.toISOString(),
  };
}

function settings(overrides: Partial<SaveV1['settings']> = {}) {
  return {
    dailyGoal: 50 as const,
    sound: false,
    newCardsPerDay: 20,
    reviewsPerDay: 100,
    ...overrides,
  };
}

describe('FlashcardSession', () => {
  it('reveals the answer and source with Space and shows the intervals', async () => {
    const user = userEvent.setup();
    const card = makeFlashcard(1);
    renderWithProgress(<FlashcardSession flashcards={[card]} />, {
      now: FIXED_NOW,
    });

    expect(screen.getByText(card.front)).toBeInTheDocument();
    expect(screen.queryByText(card.back)).not.toBeInTheDocument();

    await user.keyboard(' ');

    expect(screen.getByText(card.back)).toBeInTheDocument();
    expect(screen.getByText('Fonte: aula-172, slide 2')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mostrar resposta' }),
    ).not.toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Avaliar carta' });
    const intervals = previewIntervals(newCard(FIXED_NOW), FIXED_NOW);
    const labels = ['De novo', 'Difícil', 'Bom', 'Fácil'];

    labels.forEach((label, index) => {
      const button = within(group).getByRole('button', {
        name: new RegExp(label),
      });
      expect(button).toHaveTextContent(
        /(agora|\d+ (min|h|dias?|meses?|anos?))/,
      );
      expect(button).toHaveTextContent(intervals[index] ?? '');
    });
  });

  it('grades with key 3 and dispatches card/review', async () => {
    const user = userEvent.setup();
    const card = makeFlashcard(1);
    const storage = createMemoryStorage();
    renderWithProgress(<FlashcardSession flashcards={[card]} />, {
      now: FIXED_NOW,
      storage,
      save: {
        cards: { [card.id]: dueCard(card.id, 60) },
        introduced: { [card.id]: PAST_DAY },
      },
    });

    expect(screen.getByText('1 restantes')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(screen.getByText(card.back)).toBeInTheDocument();

    await user.keyboard('3');

    const persisted = JSON.parse(storage.getItem(SAVE_KEY) ?? '{}') as SaveV1;
    expect(persisted.reviews).toHaveLength(1);
    expect(persisted.reviews[0]).toMatchObject({
      cardId: card.id,
      grade: 3,
    });
    expect(persisted.cards[card.id]?.reps).toBe(2);

    expect(
      screen.getByRole('heading', { name: 'Revisão concluída' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 carta revisada')).toBeInTheDocument();
    expect(screen.getByText(/Próxima revisão: em/)).toBeInTheDocument();
  });

  it('mostra o resumo com XP, lembradas e próximo passo', async () => {
    const user = userEvent.setup();
    const card = makeFlashcard(1);
    renderWithProgress(<FlashcardSession flashcards={[card]} />, {
      now: FIXED_NOW,
      save: {
        cards: { [card.id]: dueCard(card.id, 60) },
        introduced: { [card.id]: PAST_DAY },
      },
    });

    await user.keyboard('{Enter}');
    await user.keyboard('3');

    expect(
      screen.getByRole('heading', { name: 'Revisão concluída' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lembradas')).toBeInTheDocument();
    expect(screen.getByText('1 de 1')).toBeInTheDocument();
    expect(screen.getByText('1 carta revisada')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Próximo passo' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Próxima revisão: em/)).toBeInTheDocument();
  });

  it('requeues a card that is due again within 15 minutes', async () => {
    const user = userEvent.setup();
    const card = makeFlashcard(1);
    renderWithProgress(<FlashcardSession flashcards={[card]} />, {
      now: FIXED_NOW,
      save: {
        cards: { [card.id]: dueCard(card.id, 60) },
        introduced: { [card.id]: PAST_DAY },
      },
    });

    await user.keyboard(' ');
    await user.keyboard('1');

    expect(screen.getByText('1 restantes')).toBeInTheDocument();
    expect(screen.getByText(card.front)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mostrar resposta' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Revisão concluída' }),
    ).not.toBeInTheDocument();
  });

  it('caps unseen cards at newCardsPerDay', () => {
    const flashcards = Array.from({ length: 25 }, (_, index) =>
      makeFlashcard(index + 1),
    );

    renderWithProgress(<FlashcardSession flashcards={flashcards} />, {
      now: FIXED_NOW,
      save: { settings: settings({ newCardsPerDay: 10 }) },
    });

    expect(
      screen.getByText('Novas hoje: 0/10 · Revisões hoje: 0/100'),
    ).toBeInTheDocument();
    expect(screen.getByText('10 restantes')).toBeInTheDocument();
  });

  it('não diz limite atingido com 0/20 novas', () => {
    const flashcards = Array.from({ length: 25 }, (_, index) =>
      makeFlashcard(index + 1),
    );

    renderWithProgress(<FlashcardSession flashcards={flashcards} />, {
      now: FIXED_NOW,
    });

    expect(
      screen.getByText('Novas hoje: 0/20 · Revisões hoje: 0/100'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Limite diário atingido/)).not.toBeInTheDocument();

    const limit = screen.getByRole('link', {
      name: 'Limite diário: 20 de 25 cartas hoje — ajuste em Ajustes',
    });
    expect(limit).toHaveAttribute('href', '/ajustes');
  });

  it('diz limite atingido quando as novas do dia acabaram', () => {
    const flashcards = Array.from({ length: 25 }, (_, index) =>
      makeFlashcard(index + 1),
    );
    const today = toDayKey(FIXED_NOW);
    const introducedCards = flashcards.slice(0, 20);
    const cards = Object.fromEntries(
      introducedCards.map((card) => [card.id, newCard(FIXED_NOW)]),
    );
    const introduced = Object.fromEntries(
      introducedCards.map((card) => [card.id, today]),
    );

    renderWithProgress(<FlashcardSession flashcards={flashcards} />, {
      now: FIXED_NOW,
      save: { cards, introduced },
    });

    expect(
      screen.getByRole('link', {
        name: 'Limite diário atingido — ajuste em Ajustes',
      }),
    ).toHaveAttribute('href', '/ajustes');
  });

  it('caps reviews at reviewsPerDay and shows the daily limit notice', () => {
    const flashcards = Array.from({ length: 8 }, (_, index) =>
      makeFlashcard(index + 1),
    );
    const cards = Object.fromEntries(
      flashcards.map((card, index) => [
        card.id,
        dueCard(card.id, index + 1),
      ]),
    );
    const introduced = Object.fromEntries(
      flashcards.map((card) => [card.id, PAST_DAY]),
    );

    renderWithProgress(<FlashcardSession flashcards={flashcards} />, {
      now: FIXED_NOW,
      save: {
        settings: settings({ reviewsPerDay: 5 }),
        cards,
        introduced,
      },
    });

    expect(
      screen.getByText('Novas hoje: 0/20 · Revisões hoje: 0/5'),
    ).toBeInTheDocument();
    expect(screen.getByText('5 restantes')).toBeInTheDocument();

    const limit = screen.getByRole('link', {
      name: 'Limite diário: 5 de 8 cartas hoje — ajuste em Ajustes',
    });
    expect(limit).toHaveAttribute('href', '/ajustes');
  });

  it('shows the empty state with a Bit line and the next due time', () => {
    renderWithProgress(<FlashcardSession flashcards={[]} />, {
      now: FIXED_NOW,
    });

    expect(
      screen.getByRole('heading', { name: 'Nada para revisar agora' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Próxima revisão:/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Bit, o robô mascote' }),
    ).toBeInTheDocument();

    const hasBitLine = BIT_LINES.empty.some(
      (line) => screen.queryByText(line) !== null,
    );
    expect(hasBitLine).toBe(true);
  });
});
