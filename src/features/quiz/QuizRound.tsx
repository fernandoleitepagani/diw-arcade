import { useEffect, useRef, useState } from 'react';
import {
  FeedbackBar,
  SessionSummary,
  useSessionBar,
} from '../../components/session';
import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import { SPRITES } from '../../components/pixel/sprites';
import { Button } from '../../components/pixel/Button/Button';
import { formatSource } from '../../content/source';
import type { NodeId } from '../../content/tree';
import type { Question, QuestionCode } from '../../content/schema';
import { useProgress } from '../../app/ProgressProvider';
import { quizAnswerXp } from '../../lib/game/xp';
import { createEmptySave } from '../../lib/storage';
import { STATIC_CONTENT } from '../../lib/progress/content';
import type { ProgressEvent } from '../../lib/progress/events';
import { getNextStep } from '../../lib/progress/nextStep';
import { getLevelProgress, getStreak } from '../../lib/progress/selectors';
import { isFillCorrect } from './grade';
import {
  answer,
  currentQuestion,
  firstTryCount,
  isComplete,
  pickRound,
  questionNumber,
  startSession,
  type QuizAnswers,
} from './session';
import { QuizOption, inlineCode } from './QuizOption';
import './QuizRound.css';

export interface QuizRoundProps {
  nodeId: NodeId;
  questions: readonly Question[];
  answers?: QuizAnswers;
  dispatch?: (event: ProgressEvent) => void;
  /** Overridable for deterministic rounds in tests. */
  rng?: () => number;
  onRestart: () => void;
  onExit: () => void;
}

interface Feedback {
  question: Question;
  correct: boolean;
  number: number;
}

function correctAnswer(question: Question): string {
  switch (question.type) {
    case 'mcq':
      return question.options[question.answer] ?? '';
    case 'tf':
      return question.answer ? 'Verdadeiro' : 'Falso';
    case 'fill':
      return question.answers.join(' ou ');
  }
}

function correctOptionIndex(question: Question): number {
  if (question.type === 'mcq') return question.answer;
  if (question.type === 'tf') return question.answer ? 0 : 1;
  return -1;
}

/** The page URL, the HTML fixture and the JS snippet a question asks about. */
function QuestionCode({ code, id }: { code: QuestionCode; id: string }) {
  const htmlLabelId = `${id}-html`;
  const jsLabelId = `${id}-js`;

  return (
    <figure
      className="quiz-round__code"
      id={id}
      role="region"
      aria-labelledby={jsLabelId}
    >
      {code.url === undefined ? null : (
        <p className="quiz-round__code-url">URL da página: {code.url}</p>
      )}
      {code.html === undefined ? null : (
        <div
          className="quiz-round__code-example"
          role="group"
          aria-labelledby={htmlLabelId}
        >
          <p id={htmlLabelId} className="quiz-round__code-caption">
            HTML de exemplo
          </p>
          {/* Scrollable code stays reachable for keyboard users. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <pre className="quiz-round__code-block" tabIndex={0} aria-label="HTML de exemplo">
            <code>{code.html}</code>
          </pre>
        </div>
      )}
      <div
        className="quiz-round__code-example"
        role="group"
        aria-labelledby={jsLabelId}
      >
        <p id={jsLabelId} className="quiz-round__code-caption">
          Código JavaScript
        </p>
        {/* Scrollable code stays reachable for keyboard users. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <pre className="quiz-round__code-block" tabIndex={0} aria-label="Código JavaScript">
          <code>{code.source}</code>
        </pre>
      </div>
    </figure>
  );
}

const LEVEL_SEGMENTS = 10;

const COUNT_WORDS = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco'];

function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

/** The Bit's one-liner above the score, in the prototype's short voice. */
function bitLine(slips: number): string {
  if (slips === 0) return 'Rodada limpa.';
  return `Boa. Só ${countWord(slips)} ${slips === 1 ? 'deslize' : 'deslizes'}.`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function proseFor(slips: number, newCards: number): string {
  const head =
    slips === 0
      ? 'Nenhum erro de primeira.'
      : `${capitalize(countWord(slips))} ${slips === 1 ? 'erro' : 'erros'} de primeira, refeito${slips === 1 ? '' : 's'} na rodada.`;
  return newCards > 0
    ? `${head} Vamos fixar com ${newCards} ${newCards === 1 ? 'carta' : 'cartas'}?`
    : head;
}

const ISOLATED_SAVE = createEmptySave(new Date(0));
const ISOLATED_NOW = new Date(0);

/** Route smoke tests render the round without ProgressProvider. */
function useOptionalProgress() {
  try {
    return useProgress();
  } catch {
    return null;
  }
}

export function QuizRound({
  nodeId,
  questions,
  answers,
  dispatch,
  rng = Math.random,
  onRestart,
  onExit,
}: QuizRoundProps) {
  const [session, setSession] = useState(() =>
    startSession(pickRound(questions, answers ?? {}, rng)),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [fillValue, setFillValue] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const progress = useOptionalProgress();

  const continueRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const reported = useRef(false);

  const question = currentQuestion(session);
  const canSubmitFill =
    question?.type === 'fill' && fillValue.trim().length > 0;

  const answered = session.asked.size;
  const progressNumber = feedback ? feedback.number : questionNumber(session);
  useSessionBar({
    value: progressNumber,
    max: session.total,
    // The session layout defaults to "/" until the round has progress; after
    // the first answer, exiting returns to the node the quiz belongs to.
    exitTo: answered > 0 ? `/no/${nodeId}` : '/',
    confirmExit:
      answered > 0 && !finished
        ? {
            title: 'Sair da rodada?',
            message: 'O progresso desta rodada será perdido.',
          }
        : null,
  });

  function isCorrect(current: Question, optionIndex?: number): boolean {
    if (current.type === 'mcq') return optionIndex === current.answer;
    if (current.type === 'tf') {
      return optionIndex !== undefined && (optionIndex === 0) === current.answer;
    }
    return isFillCorrect(current, fillValue);
  }

  /** Options answer with their index; fill answers from the typed text. */
  function submit(optionIndex?: number): void {
    if (feedback || finished || submitting.current) return;
    const current = currentQuestion(session);
    if (!current) return;
    if (current.type === 'fill' ? !canSubmitFill : optionIndex === undefined) {
      return;
    }

    submitting.current = true;
    const correct = isCorrect(current, optionIndex);
    const result = answer(session, correct);

    if (optionIndex !== undefined) setSelected(optionIndex);
    setSession(result.session);
    setFeedback({
      question: current,
      correct,
      number: questionNumber(session),
    });
    setXpEarned((total) => total + quizAnswerXp(correct, result.firstTry));
    dispatch?.({
      type: 'quiz/answer',
      nodeId,
      questionId: current.id,
      correct,
      firstTry: result.firstTry,
    });
  }

  function continueRound(): void {
    submitting.current = false;
    setFeedback(null);
    setSelected(null);
    setFillValue('');
    if (isComplete(session)) setFinished(true);
  }

  useEffect(() => {
    if (feedback) continueRef.current?.focus();
  }, [feedback]);

  useEffect(() => {
    if (feedback || finished) return;
    // Options are not focused on purpose: Enter on a focused option would
    // answer it. The group takes focus so Tab reaches A first.
    questionRef.current
      ?.querySelector<HTMLElement>('input, textarea, [data-quiz-group]')
      ?.focus();
  }, [feedback, finished, question]);

  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    dispatch?.({
      type: 'quiz/roundComplete',
      nodeId,
      total: session.total,
      firstTryCorrect: firstTryCount(session),
    });
  }, [dispatch, finished, nodeId, session]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (finished) return;

      if (feedback) {
        // Continuar is focused after an answer and handles Enter natively.
        if (event.key === 'Enter' && event.target !== continueRef.current) {
          event.preventDefault();
          continueRound();
        }
        return;
      }

      const current = currentQuestion(session);
      if (!current) return;

      const target = event.target;
      const typing =
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement;

      if (!typing && current.type !== 'fill') {
        const count = current.type === 'mcq' ? 4 : 2;
        const key = event.key.toLowerCase();
        const index = /^[1-4]$/.test(key)
          ? Number(key) - 1
          : 'abcd'.indexOf(key);
        if (key.length === 1 && index >= 0 && index < count) {
          event.preventDefault();
          submit(index);
        }
        return;
      }

      if (event.key === 'Enter' && canSubmitFill) {
        event.preventDefault();
        submit();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (finished) {
    const total = session.total;
    const firstTry = firstTryCount(session);
    const slips = total - firstTry;

    const save = progress?.save ?? ISOLATED_SAVE;
    const now = progress?.now ?? ISOLATED_NOW;
    const nextStep = getNextStep(save, STATIC_CONTENT, now);
    const newCards = (STATIC_CONTENT.flashcards?.[nodeId] ?? []).filter(
      (card) => save.cards[card.id] === undefined,
    ).length;
    const levelState = getLevelProgress(save);
    const fixLabel = `Fixar com ${newCards} ${newCards === 1 ? 'carta' : 'cartas'}`;

    return (
      <section
        className="quiz-round quiz-round__summary"
        aria-label="Resumo da rodada"
      >
        <SessionSummary
          title="Rodada concluída"
          xp={xpEarned}
          stats={[]}
          bitLine={bitLine(slips)}
          score={{ right: firstTry, total }}
          facts={[
            { label: 'XP', value: `+${xpEarned}`, sprite: 'coin' },
            { label: 'cartas novas', value: newCards },
            {
              label: 'dias de sequência',
              value: getStreak(save, now),
              sprite: 'flame',
            },
          ]}
          level={{
            missing: levelState.xpForNextLevel - levelState.xpInLevel,
            next: levelState.level + 1,
            on: Math.floor(levelState.progress * LEVEL_SEGMENTS),
            total: LEVEL_SEGMENTS,
          }}
          prose={proseFor(slips, newCards)}
          next={
            newCards > 0
              ? { label: fixLabel, href: `/no/${nodeId}/cartas` }
              : nextStep.primary
          }
          secondary={
            <>
              <Button variant="quiet" onClick={onRestart}>Nova rodada</Button>
              <Button variant="quiet" onClick={onExit}>
                Voltar ao nó
              </Button>
            </>
          }
        />
      </section>
    );
  }

  const active = feedback ? feedback.question : question;
  const locked = feedback !== null;
  const promptId = active ? `quiz-prompt-${active.id}` : undefined;
  const codeId = active?.code === undefined ? undefined : `quiz-code-${active.id}`;

  function renderOptions(labels: readonly string[], current: Question) {
    return (
      <div
        className="quiz-round__options"
        role="group"
        aria-labelledby={promptId}
        aria-describedby={codeId}
        tabIndex={-1}
        data-quiz-group=""
      >
        {labels.map((option, index) => (
          <QuizOption
            key={option}
            label={option}
            index={index}
            locked={locked}
            picked={locked && selected === index}
            correct={locked && index === correctOptionIndex(current)}
            onSelect={submit}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="quiz-round" aria-label="Rodada do quiz">
      {active ? (
        <div ref={questionRef} className="quiz-round__question">
          <p id={promptId} className="quiz-round__prompt">
            {active.prompt}
          </p>
          {active.code === undefined ? null : (
            <QuestionCode id={`quiz-code-${active.id}`} code={active.code} />
          )}

          {active.type === 'mcq' ? (
            renderOptions(active.options, active)
          ) : active.type === 'tf' ? (
            renderOptions(['Verdadeiro', 'Falso'], active)
          ) : (
            <form
              className="quiz-round__fill"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <label htmlFor={`quiz-fill-${active.id}`}>Sua resposta</label>
              <input
                id={`quiz-fill-${active.id}`}
                type="text"
                autoComplete="off"
                value={fillValue}
                disabled={locked}
                readOnly={locked}
                aria-describedby={
                  codeId === undefined ? promptId : `${promptId} ${codeId}`
                }
                onChange={(event) => setFillValue(event.target.value)}
              />
              {locked ? (
                <p className="quiz-round__fill-answer">
                  Sua resposta: <strong>{fillValue}</strong>
                </p>
              ) : (
                <div className="quiz-round__actions">
                  <Button type="submit" disabled={!canSubmitFill}>
                    Responder
                  </Button>
                  <span className="quiz-round__hint">Enter responde.</span>
                </div>
              )}
            </form>
          )}

          {active.type === 'fill' ? null : (
            <p className="quiz-round__hint">
              Dica: as teclas A a D escolhem a resposta e Enter continua.
            </p>
          )}
        </div>
      ) : (
        <p className="quiz-round__empty">Conteúdo em breve</p>
      )}

      {feedback ? (
        <FeedbackBar
          ref={continueRef}
          className="quiz-round__feedback"
          verdict={feedback.correct ? 'correct' : 'wrong'}
          onContinue={continueRound}
          mark={
            <span className="quiz-round__sprite">
              <PixelSprite
                rows={SPRITES.bit.rows}
                palette={SPRITES.bit.palette}
                scale={3}
              />
            </span>
          }
        >
          <p className="quiz-round__explanation">
            {feedback.correct ? null : (
              <>
                A resposta é <code>{correctAnswer(feedback.question)}</code>.{' '}
              </>
            )}
            {inlineCode(feedback.question.explanation)}
          </p>
          <p className="quiz-round__source">
            <PixelIcon name="book" scale={2} />
            {formatSource(feedback.question.source)}
          </p>
        </FeedbackBar>
      ) : null}
    </section>
  );
}
