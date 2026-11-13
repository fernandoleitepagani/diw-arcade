import { useEffect, useRef, useState } from 'react';
import {
  FeedbackBar,
  SessionSummary,
  useSessionBar,
} from '../../components/session';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import { SPRITES } from '../../components/pixel/sprites';
import { Button } from '../../components/pixel/Button/Button';
import { pickLine } from '../../content/copy';
import { formatSource } from '../../content/source';
import type { NodeId } from '../../content/tree';
import type { Question, QuestionCode } from '../../content/schema';
import { useProgress } from '../../app/ProgressProvider';
import { quizAnswerXp } from '../../lib/game/xp';
import { createEmptySave } from '../../lib/storage';
import { STATIC_CONTENT } from '../../lib/progress/content';
import type { ProgressEvent } from '../../lib/progress/events';
import { getNextStep } from '../../lib/progress/nextStep';
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
import { QuizOption } from './QuizOption';
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
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const reported = useRef(false);

  const question = currentQuestion(session);
  const canSubmit =
    question !== undefined &&
    (question.type === 'fill' ? fillValue.trim().length > 0 : selected !== null);

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

  function isCorrect(current: Question): boolean {
    if (current.type === 'mcq') {
      return selected !== null && selected === current.answer;
    }
    if (current.type === 'tf') {
      return selected !== null && (selected === 0) === current.answer;
    }
    return isFillCorrect(current, fillValue);
  }

  function submit(): void {
    if (feedback || finished || submitting.current || !canSubmit) return;
    const current = currentQuestion(session);
    if (!current) return;

    submitting.current = true;
    const correct = isCorrect(current);
    const result = answer(session, correct);

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
    formRef.current
      ?.querySelector<HTMLElement>('input, textarea, button')
      ?.focus();
  }, [feedback, finished]);

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
      if (feedback || finished) return;

      const current = currentQuestion(session);
      if (!current) return;

      const target = event.target;
      const typing =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== 'radio');

      if (!typing && current.type !== 'fill') {
        const count = current.type === 'mcq' ? 4 : 2;
        const key = event.key.toLowerCase();
        const index = /^[1-4]$/.test(key)
          ? Number(key) - 1
          : 'abcd'.indexOf(key);
        if (key.length === 1 && index >= 0 && index < count) {
          setSelected(index);
          event.preventDefault();
          return;
        }
      }

      if (event.key === 'Enter' && canSubmit) {
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
    const accuracy = total === 0 ? 0 : Math.round((firstTry / total) * 100);

    const nextStep = getNextStep(
      progress?.save ?? ISOLATED_SAVE,
      STATIC_CONTENT,
      progress?.now ?? ISOLATED_NOW,
    );

    return (
      <section
        className="quiz-round quiz-round__summary"
        aria-label="Resumo da rodada"
      >
        <SessionSummary
          title="Rodada concluída"
          xp={xpEarned}
          stats={[
            {
              label: 'Acertos de primeira',
              value: `${firstTry} de ${total} (${accuracy}%)`,
            },
          ]}
          next={nextStep.primary}
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

  return (
    <section className="quiz-round" aria-label="Rodada do quiz">
      <div className="quiz-round__progress">
        <p className="quiz-round__progress-text">
          Questão {progressNumber} de {session.total}
        </p>
      </div>

      {active ? (
        <form
          ref={formRef}
          className="quiz-round__form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {active.type === 'mcq' ? (
            <fieldset
              className="quiz-round__options"
              aria-describedby={
                active.code === undefined
                  ? undefined
                  : `quiz-code-${active.id}`
              }
            >
              <legend className="quiz-round__prompt">{active.prompt}</legend>
              {active.code === undefined ? null : (
                <QuestionCode
                  id={`quiz-code-${active.id}`}
                  code={active.code}
                />
              )}
              {active.options.map((option, index) => (
                <QuizOption
                  key={option}
                  label={option}
                  index={index}
                  selected={selected === index}
                  locked={locked}
                  correct={locked && index === correctOptionIndex(active)}
                  onSelect={setSelected}
                />
              ))}
            </fieldset>
          ) : active.type === 'tf' ? (
            <fieldset className="quiz-round__options">
              <legend className="quiz-round__prompt">{active.prompt}</legend>
              {['Verdadeiro', 'Falso'].map((option, index) => (
                <QuizOption
                  key={option}
                  label={option}
                  index={index}
                  selected={selected === index}
                  locked={locked}
                  correct={locked && index === correctOptionIndex(active)}
                  onSelect={setSelected}
                />
              ))}
            </fieldset>
          ) : (
            <div className="quiz-round__fill">
              <p id={`quiz-prompt-${active.id}`} className="quiz-round__prompt">
                {active.prompt}
              </p>
              {active.code === undefined ? null : (
                <QuestionCode
                  id={`quiz-code-${active.id}`}
                  code={active.code}
                />
              )}
              <label htmlFor={`quiz-fill-${active.id}`}>Sua resposta</label>
              <input
                id={`quiz-fill-${active.id}`}
                type="text"
                autoComplete="off"
                value={fillValue}
                disabled={locked}
                readOnly={locked}
                aria-describedby={
                  active.code === undefined
                    ? `quiz-prompt-${active.id}`
                    : `quiz-prompt-${active.id} quiz-code-${active.id}`
                }
                onChange={(event) => setFillValue(event.target.value)}
              />
              {locked ? (
                <p className="quiz-round__fill-answer">
                  Sua resposta: <strong>{fillValue}</strong>
                </p>
              ) : null}
            </div>
          )}

          {locked ? null : (
            <div className="quiz-round__actions">
              <Button type="submit" disabled={!canSubmit}>
                Responder
              </Button>
              <span className="quiz-round__hint">
                {active.type === 'fill'
                  ? 'Enter responde.'
                  : 'Teclas A a D escolhem; Enter responde.'}
              </span>
            </div>
          )}
        </form>
      ) : (
        <p className="quiz-round__empty">Conteúdo em breve</p>
      )}

      {feedback ? (
        <FeedbackBar
          ref={continueRef}
          className="quiz-round__feedback"
          verdict={feedback.correct ? 'correct' : 'wrong'}
          onContinue={continueRound}
        >
          {feedback.question.type === 'fill' ? (
            <p className="quiz-round__answer">
              Resposta correta:{' '}
              <strong>{correctAnswer(feedback.question)}</strong>
            </p>
          ) : null}
          <p className="quiz-round__explanation">
            {feedback.question.explanation}
          </p>
          <p className="quiz-round__source">
            {formatSource(feedback.question.source)}
          </p>
          <p className="quiz-round__bit">
            <span className="quiz-round__sprite">
              <PixelSprite
                rows={SPRITES.bit.rows}
                palette={SPRITES.bit.palette}
                scale={4}
              />
            </span>
            <span>
              {pickLine(
                feedback.correct ? 'correct' : 'wrong',
                feedback.number,
              )}
            </span>
          </p>
        </FeedbackBar>
      ) : null}
    </section>
  );
}
