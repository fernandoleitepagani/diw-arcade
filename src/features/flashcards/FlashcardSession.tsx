import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { Button, Mascot } from '../../components/ui';
import { pickLine } from '../../content/copy';
import type { Flashcard } from '../../content/schema';
import type { Outcome } from '../../lib/progress/events';
import {
  getNewIntroducedToday,
  getReviewsDoneToday,
} from '../../lib/progress/selectors';
import {
  GRADES,
  GRADE_LABELS,
  buildQueue,
  isDue,
  newCard,
  previewIntervals,
  reviewCard,
  type Grade,
  type SrsCard,
} from '../../lib/srs/fsrs';
import { createEmptySave } from '../../lib/storage';
import './FlashcardSession.css';

const REQUEUE_WINDOW_MS = 15 * 60_000;

const ISOLATED_SAVE = createEmptySave(new Date(0));
const ISOLATED_NOW = new Date(0);
const NO_OUTCOME: Outcome = {
  xpGained: 0,
  levelUp: null,
  achievements: [],
  streakExtended: null,
};
const NOOP_DISPATCH = (): Outcome => NO_OUTCOME;

/**
 * The app mounts ProgressProvider around the router. The route smoke tests
 * render pages without it, so read the context when present and fall back to a
 * quiet, empty session when it is not.
 */
function useOptionalProgress(): ProgressContextValue | null {
  try {
    return useProgress();
  } catch {
    return null;
  }
}

export interface FlashcardSessionProps {
  /** Cards of the current deck, in content order. */
  flashcards: readonly Flashcard[];
}

function mergeCard(
  saved: SrsCard | undefined,
  update: SrsCard | undefined,
): SrsCard | undefined {
  if (update === undefined) return saved;
  if (saved === undefined) return update;
  return update.reps > saved.reps ? update : saved;
}

function capStopped(
  flashcards: readonly Flashcard[],
  cards: Record<string, SrsCard>,
  now: Date,
  newSlots: number,
  reviewSlots: number,
): boolean {
  let unseen = 0;
  let due = 0;

  for (const flashcard of flashcards) {
    const card = cards[flashcard.id];
    if (card === undefined) {
      unseen += 1;
    } else if (card.reps > 0 && isDue(card, now)) {
      due += 1;
    }
  }

  return unseen > newSlots || due > reviewSlots;
}

function nextDueAt(
  flashcards: readonly Flashcard[],
  cards: Record<string, SrsCard>,
  now: Date,
): number | null {
  let next: number | null = null;

  for (const flashcard of flashcards) {
    const card = cards[flashcard.id];
    const due = card === undefined ? now.getTime() : Date.parse(card.due);
    if (Number.isNaN(due)) continue;
    if (next === null || due < next) next = due;
  }

  return next;
}

function formatNextDue(next: number | null, now: Date): string {
  if (next === null) return 'nenhuma carta agendada';

  const minutes = Math.round((next - now.getTime()) / 60_000);
  if (minutes <= 0) return 'agora';
  if (minutes < 60) return `em ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (minutes < 24 * 60) return `em ${hours} h`;

  const days = Math.round(minutes / (24 * 60));
  if (days < 30) return `em ${days} ${days === 1 ? 'dia' : 'dias'}`;

  const months = Math.round(days / 30);
  if (months < 12) return `em ${months} ${months === 1 ? 'mês' : 'meses'}`;

  const years = Math.round(months / 12);
  return `em ${years} ${years === 1 ? 'ano' : 'anos'}`;
}

function sourceLabel(flashcard: Flashcard): string {
  const aula = String(flashcard.source.aula).padStart(3, '0');
  return `Fonte: aula-${aula}, slide ${flashcard.source.slide}`;
}

function gradeVariant(grade: Grade): 'primary' | 'secondary' | 'danger' {
  if (grade === 1) return 'danger';
  if (grade === 3) return 'primary';
  return 'secondary';
}

export function FlashcardSession({ flashcards }: FlashcardSessionProps) {
  const progress = useOptionalProgress();
  const save = progress?.save ?? ISOLATED_SAVE;
  const dispatch = progress?.dispatch ?? NOOP_DISPATCH;
  const now = progress?.now ?? ISOLATED_NOW;

  const deckIds = useMemo(
    () => flashcards.map((flashcard) => flashcard.id),
    [flashcards],
  );
  const flashcardById = useMemo(
    () => new Map(flashcards.map((flashcard) => [flashcard.id, flashcard])),
    [flashcards],
  );

  const newIntroducedToday = getNewIntroducedToday(save, now);
  const reviewsDoneToday = getReviewsDoneToday(save, now);
  const newLimit = save.settings.newCardsPerDay;
  const reviewLimit = save.settings.reviewsPerDay;

  const [queue, setQueue] = useState<string[]>(() =>
    buildQueue(deckIds, save.cards, now, {
      newLimit,
      newIntroducedToday,
      reviewLimit,
      reviewsDoneToday,
    }),
  );
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [updates, setUpdates] = useState<Record<string, SrsCard>>({});

  const effectiveCards = useMemo(() => {
    const merged: Record<string, SrsCard> = { ...save.cards };
    for (const [cardId, update] of Object.entries(updates)) {
      const card = mergeCard(merged[cardId], update);
      if (card !== undefined) merged[cardId] = card;
    }
    return merged;
  }, [save.cards, updates]);

  const currentId = queue[0];
  const current = currentId ? flashcardById.get(currentId) : undefined;
  const currentCard = currentId
    ? (effectiveCards[currentId] ?? newCard(now))
    : undefined;
  const intervals = currentCard ? previewIntervals(currentCard, now) : [];

  const newSlots = Math.max(0, newLimit - newIntroducedToday);
  const reviewSlots = Math.max(0, reviewLimit - reviewsDoneToday);
  const blocked = capStopped(
    flashcards,
    effectiveCards,
    now,
    newSlots,
    reviewSlots,
  );

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    (value: Grade) => {
      if (current === undefined || currentCard === undefined) return;

      const next = reviewCard(currentCard, value, now);
      dispatch({
        type: 'card/review',
        nodeId: current.nodeId,
        cardId: current.id,
        grade: value,
      });
      setUpdates((previous) => ({ ...previous, [current.id]: next }));
      setCompleted((count) => count + 1);
      setRevealed(false);
      setQueue((previous) => {
        if (previous[0] !== current.id) return previous;
        const rest = previous.slice(1);
        return Date.parse(next.due) - now.getTime() <= REQUEUE_WINDOW_MS
          ? [...rest, current.id]
          : rest;
      });
    },
    [current, currentCard, dispatch, now],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        current === undefined
      ) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
        // Let Space and Enter activate a focused button or link natively.
        if (!revealed && (tag === 'BUTTON' || tag === 'A')) return;
      }

      if (!revealed) {
        if (
          event.key === ' ' ||
          event.code === 'Space' ||
          event.key === 'Enter'
        ) {
          event.preventDefault();
          reveal();
        }
        return;
      }

      const value = Number(event.key);
      if (Number.isInteger(value) && value >= 1 && value <= 4) {
        event.preventDefault();
        grade(value as Grade);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, grade, reveal, revealed]);

  const isEmpty = queue.length === 0 && completed === 0;
  const isFinished = queue.length === 0 && completed > 0;
  const nextLabel = formatNextDue(
    nextDueAt(flashcards, effectiveCards, now),
    now,
  );

  return (
    <section className="flashcard-session" aria-label="Sessão de revisão">
      <header className="flashcard-session__header">
        <p className="flashcard-session__counters">
          {`Novas hoje: ${newIntroducedToday}/${newLimit} · Revisões hoje: ${reviewsDoneToday}/${reviewLimit}`}
        </p>
        {queue.length > 0 ? (
          <p className="flashcard-session__remaining" role="status">
            {`${queue.length} restantes`}
          </p>
        ) : null}
      </header>

      {blocked ? (
        <p className="flashcard-session__cap">
          <Link to="/ajustes">Limite diário atingido — ajuste em Ajustes</Link>
        </p>
      ) : null}

      {isEmpty ? (
        <div className="flashcard-session__empty">
          <h2>Nada para revisar agora</h2>
          <p className="flashcard-session__next">
            {`Próxima revisão: ${nextLabel}`}
          </p>
          <Mascot mood="idle" line={pickLine('empty', save.xpTotal)} size={96} />
        </div>
      ) : isFinished ? (
        <div className="flashcard-session__done">
          <h2>Revisão concluída</h2>
          <p className="flashcard-session__done-count">
            {`${completed} ${
              completed === 1 ? 'carta revisada' : 'cartas revisadas'
            }`}
          </p>
          <p className="flashcard-session__next">
            {`Próxima revisão: ${nextLabel}`}
          </p>
        </div>
      ) : current ? (
        <article
          key={current.id}
          className="flashcard-session__card"
          aria-live="polite"
        >
          <p className="flashcard-session__front">{current.front}</p>

          {revealed ? (
            <div className="flashcard-session__answer">
              <p className="flashcard-session__back">{current.back}</p>
              <p className="flashcard-session__source">
                {sourceLabel(current)}
              </p>
              <div
                className="flashcard-session__grades"
                role="group"
                aria-label="Avaliar carta"
              >
                {GRADES.map((value, index) => (
                  <Button
                    key={value}
                    className="flashcard-session__grade"
                    variant={gradeVariant(value)}
                    size="lg"
                    onClick={() => grade(value)}
                  >
                    <span className="flashcard-session__grade-label">
                      {GRADE_LABELS[value]}
                    </span>
                    <span className="flashcard-session__grade-interval">
                      {intervals[index]}
                    </span>
                    <kbd className="flashcard-session__grade-key">{value}</kbd>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Button
              className="flashcard-session__reveal"
              size="lg"
              onClick={reveal}
            >
              Mostrar resposta
            </Button>
          )}
        </article>
      ) : null}
    </section>
  );
}
