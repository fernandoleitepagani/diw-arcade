import { useEffect, useRef, useState } from 'react';
import { SessionSummary, useSessionBar } from '../../components/session';
import { Button, Mascot } from '../../components/ui';
import { pickLine } from '../../content/copy';
import { formatSource } from '../../content/source';
import type { NodeId } from '../../content/tree';
import type { Question } from '../../content/schema';
import { quizAnswerXp } from '../../lib/game/xp';
import type { ProgressEvent } from '../../lib/progress/events';
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

      if (current.type === 'mcq' && /^[1-4]$/.test(event.key)) {
        setSelected(Number(event.key) - 1);
        event.preventDefault();
        return;
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
          nextHref={`/no/${nodeId}`}
          mascotMood={accuracy >= 60 ? 'happy' : 'sad'}
          secondary={
            <>
              <Button onClick={onRestart}>Nova rodada</Button>
              <Button variant="secondary" onClick={onExit}>
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
            <fieldset className="quiz-round__options">
              <legend className="quiz-round__prompt">{active.prompt}</legend>
              {active.options.map((option, index) => {
                const picked = locked && selected === index;
                const correct = locked && index === correctOptionIndex(active);
                const classes = [
                  'quiz-round__option',
                  !locked && selected === index
                    ? 'quiz-round__option--selected'
                    : '',
                  picked ? 'quiz-round__option--picked' : '',
                  correct ? 'quiz-round__option--correct' : '',
                  locked ? 'quiz-round__option--readonly' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <label key={option} className={classes}>
                    <input
                      type="radio"
                      name="quiz-option"
                      value={index}
                      checked={selected === index}
                      disabled={locked}
                      onChange={() => setSelected(index)}
                    />
                    <span className="quiz-round__key" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="quiz-round__option-text">{option}</span>
                    {locked ? (
                      <span className="quiz-round__tags">
                        {picked ? (
                          <span className="quiz-round__tag quiz-round__tag--picked">
                            Sua resposta
                          </span>
                        ) : null}
                        {correct ? (
                          <span className="quiz-round__tag quiz-round__tag--correct">
                            Resposta correta
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </fieldset>
          ) : active.type === 'tf' ? (
            <fieldset className="quiz-round__options">
              <legend className="quiz-round__prompt">{active.prompt}</legend>
              {['Verdadeiro', 'Falso'].map((option, index) => {
                const picked = locked && selected === index;
                const correct = locked && index === correctOptionIndex(active);
                const classes = [
                  'quiz-round__option',
                  !locked && selected === index
                    ? 'quiz-round__option--selected'
                    : '',
                  picked ? 'quiz-round__option--picked' : '',
                  correct ? 'quiz-round__option--correct' : '',
                  locked ? 'quiz-round__option--readonly' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <label key={option} className={classes}>
                    <input
                      type="radio"
                      name="quiz-option"
                      value={index}
                      checked={selected === index}
                      disabled={locked}
                      onChange={() => setSelected(index)}
                    />
                    <span className="quiz-round__option-text">{option}</span>
                    {locked ? (
                      <span className="quiz-round__tags">
                        {picked ? (
                          <span className="quiz-round__tag quiz-round__tag--picked">
                            Sua resposta
                          </span>
                        ) : null}
                        {correct ? (
                          <span className="quiz-round__tag quiz-round__tag--correct">
                            Resposta correta
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <div className="quiz-round__fill">
              <p id={`quiz-prompt-${active.id}`} className="quiz-round__prompt">
                {active.prompt}
              </p>
              <label htmlFor={`quiz-fill-${active.id}`}>Sua resposta</label>
              <input
                id={`quiz-fill-${active.id}`}
                type="text"
                autoComplete="off"
                value={fillValue}
                disabled={locked}
                readOnly={locked}
                aria-describedby={`quiz-prompt-${active.id}`}
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
                {active.type === 'mcq'
                  ? 'Teclas 1–4 escolhem; Enter responde.'
                  : 'Enter responde.'}
              </span>
            </div>
          )}
        </form>
      ) : (
        <p className="quiz-round__empty">Conteúdo em breve</p>
      )}

      {feedback ? (
        <div
          className={`quiz-round__feedback quiz-round__feedback--${
            feedback.correct ? 'correct' : 'wrong'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="quiz-round__verdict">
            {feedback.correct ? 'Correto!' : 'Incorreto'}
          </p>
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
          <Mascot
            mood={feedback.correct ? 'happy' : 'sad'}
            line={pickLine(
              feedback.correct ? 'correct' : 'wrong',
              feedback.number,
            )}
            size={72}
          />
          <div className="quiz-round__actions">
            <Button ref={continueRef} onClick={continueRound}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
