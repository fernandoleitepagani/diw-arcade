import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  useProgress,
  type ProgressContextValue,
} from "../../app/ProgressProvider";
import { SessionSummary, useSessionBar } from "../../components/session";
import { Button } from "../../components/pixel/Button/Button";
import { PixelPanel } from "../../components/pixel/PixelPanel/PixelPanel";
import { PixelSprite } from "../../components/pixel/PixelSprite/PixelSprite";
import { SPRITES } from "../../components/pixel/sprites";
import { pickLine } from "../../content/copy";
import { formatSource } from "../../content/source";
import type { Flashcard } from "../../content/schema";
import type { Outcome } from "../../lib/progress/events";
import { STATIC_CONTENT } from "../../lib/progress/content";
import { getNextStep } from "../../lib/progress/nextStep";
import {
  getNewIntroducedToday,
  getReviewsDoneToday,
  getStars,
} from "../../lib/progress/selectors";
import {
  GRADES,
  GRADE_LABELS,
  buildQueue,
  newCard,
  previewIntervals,
  reviewCard,
  type Grade,
  type SrsCard,
} from "../../lib/srs/fsrs";
import { createEmptySave } from "../../lib/storage";
import { getLimitNotice } from "./limitNotice";
import "./FlashcardSession.css";

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
  if (next === null) return "nenhuma carta agendada";

  const minutes = Math.round((next - now.getTime()) / 60_000);
  if (minutes <= 0) return "agora";
  if (minutes < 60) return `em ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (minutes < 24 * 60) return `em ${hours} h`;

  const days = Math.round(minutes / (24 * 60));
  if (days < 30) return `em ${days} ${days === 1 ? "dia" : "dias"}`;

  const months = Math.round(days / 30);
  if (months < 12) return `em ${months} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.round(months / 12);
  return `em ${years} ${years === 1 ? "ano" : "anos"}`;
}

function gradeVariant(grade: Grade): "primary" | "quiet" {
  return grade === 3 ? "primary" : "quiet";
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
  const [remembered, setRemembered] = useState(0);
  const [updates, setUpdates] = useState<Record<string, SrsCard>>({});
  const [sessionStart] = useState(() => ({
    save,
    xpTotal: save.xpTotal,
  }));
  const gradesRef = useRef<HTMLDivElement>(null);

  const effectiveCards = useMemo(() => {
    const merged: Record<string, SrsCard> = { ...save.cards };
    for (const [cardId, update] of Object.entries(updates)) {
      const card = mergeCard(merged[cardId], update);
      if (card !== undefined) merged[cardId] = card;
    }
    return merged;
  }, [save.cards, updates]);

  /** A node deck shares one id; the mixed review deck stays unscoped. */
  const deckNodeId = useMemo(() => {
    const first = flashcards[0];
    if (first === undefined) return undefined;
    return flashcards.every((card) => card.nodeId === first.nodeId)
      ? first.nodeId
      : undefined;
  }, [flashcards]);

  const currentId = queue[0];
  const current = currentId ? flashcardById.get(currentId) : undefined;
  const currentCard = currentId
    ? (effectiveCards[currentId] ?? newCard(now))
    : undefined;
  const intervals = currentCard ? previewIntervals(currentCard, now) : [];

  const newSlots = Math.max(0, newLimit - newIntroducedToday);
  const reviewSlots = Math.max(0, reviewLimit - reviewsDoneToday);
  const limitNotice = getLimitNotice(
    flashcards,
    effectiveCards,
    now,
    newSlots,
    reviewSlots,
  );

  useSessionBar({
    value: completed,
    max: completed + queue.length,
    exitTo: deckNodeId === undefined ? "/" : `/no/${deckNodeId}`,
  });

  const xpEarned = Math.max(0, save.xpTotal - sessionStart.xpTotal);
  const starsBefore =
    deckNodeId === undefined
      ? undefined
      : getStars(sessionStart.save, deckNodeId, STATIC_CONTENT);
  const starsAfter =
    deckNodeId === undefined
      ? undefined
      : getStars(save, deckNodeId, STATIC_CONTENT);
  const nextStep = getNextStep(save, STATIC_CONTENT, now);

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    (value: Grade) => {
      if (current === undefined || currentCard === undefined) return;

      const next = reviewCard(currentCard, value, now);
      dispatch({
        type: "card/review",
        nodeId: current.nodeId,
        cardId: current.id,
        grade: value,
      });
      setUpdates((previous) => ({ ...previous, [current.id]: next }));
      setCompleted((count) => count + 1);
      if (value >= 3) setRemembered((count) => count + 1);
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
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
        // Let Space and Enter activate a focused button or link natively.
        if (!revealed && (tag === "BUTTON" || tag === "A")) return;
      }

      if (!revealed) {
        if (
          event.key === " " ||
          event.code === "Space" ||
          event.key === "Enter"
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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, grade, reveal, revealed]);

  useEffect(() => {
    if (!revealed) return;
    gradesRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [revealed]);

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
          {`Novas hoje: ${newIntroducedToday}/${newLimit}, revisões hoje: ${reviewsDoneToday}/${reviewLimit}`}
        </p>
        {queue.length > 0 ? (
          <p className="flashcard-session__remaining" role="status">
            {`${queue.length} restantes`}
          </p>
        ) : null}
      </header>

      {limitNotice ? (
        <p
          className={`flashcard-session__cap${
            limitNotice.reached ? " flashcard-session__cap--reached" : ""
          }`}
        >
          <Link to="/ajustes">
            {limitNotice.reached
              ? "Limite diário atingido, ajuste em Ajustes"
              : `Limite diário: ${limitNotice.shown} de ${limitNotice.total} cartas hoje, ajuste em Ajustes`}
          </Link>
        </p>
      ) : null}

      {isEmpty ? (
        <div className="flashcard-session__empty">
          <h2>Nada para revisar agora</h2>
          <p className="flashcard-session__next">
            {`Próxima revisão: ${nextLabel}`}
          </p>
          <p className="flashcard-session__bit">
            <PixelSprite
              rows={SPRITES.bit.rows}
              palette={SPRITES.bit.palette}
              scale={6}
              label="Bit, o robô mascote"
            />
            <span>{pickLine("empty", save.xpTotal)}</span>
          </p>
        </div>
      ) : isFinished ? (
        <div className="flashcard-session__done">
          <SessionSummary
            title="Revisão concluída"
            xp={xpEarned}
            stats={[
              {
                label: "Cartas",
                value: `${completed} ${
                  completed === 1 ? "carta revisada" : "cartas revisadas"
                }`,
              },
              {
                label: "Lembradas",
                value: `${remembered} de ${completed}`,
              },
            ]}
            starsBefore={starsBefore}
            starsAfter={starsAfter}
            next={nextStep.primary}
          />
          <p className="flashcard-session__next">
            {`Próxima revisão: ${nextLabel}`}
          </p>
        </div>
      ) : current ? (
        <PixelPanel
          as="article"
          key={current.id}
          className="flashcard-session__card"
          aria-live="polite"
        >
          <p className="flashcard-session__front">{current.front}</p>

          {revealed ? (
            <div className="flashcard-session__answer">
              <p className="flashcard-session__back">{current.back}</p>
              <p className="flashcard-session__source">
                {formatSource(current.source)}
              </p>
            </div>
          ) : (
            <Button className="flashcard-session__reveal" onClick={reveal}>
              Mostrar resposta
            </Button>
          )}
        </PixelPanel>
      ) : null}

      {current && revealed ? (
        <div className="flashcard-session__bar" data-grades-bar>
          <div
            ref={gradesRef}
            className="flashcard-session__grades"
            role="group"
            aria-label="Avaliar carta"
          >
            {GRADES.map((value, index) => (
              <Button
                key={value}
                className="flashcard-session__grade"
                variant={gradeVariant(value)}
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
      ) : null}
    </section>
  );
}
