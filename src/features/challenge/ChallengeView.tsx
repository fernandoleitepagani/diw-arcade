import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Dialog } from '../../components/session/Dialog';
import { SessionSummary } from '../../components/session/SessionSummary';
import { Button } from '../../components/pixel/Button/Button';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { FeedbackBar } from '../../components/session/FeedbackBar';
import {
  NODES,
  getChallenges,
  getFlashcards,
  getQuestions,
} from '../../content';
import type { Challenge, CodeFiles } from '../../content/schema';
import type {
  HintTier,
  Outcome,
  ProgressContent,
  ProgressEvent,
} from '../../lib/progress/events';
import { getRecommendedNodeId } from '../../lib/progress/recommend';
import { getStars, type Stars } from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage/schema';
import { SandboxFrame } from '../runner/SandboxFrame';
import type { RequirementResult } from '../runner/messages';
import type { RunResult } from '../runner/runner';
import { CodeEditor, type EditorLanguage } from './CodeEditor';
import { HintPanel } from './HintPanel';
import { RequirementList } from './RequirementList';
import './ChallengeView.css';

export type ChallengeProgressState = SaveV1['challenges'][string];

export interface ChallengeViewProps {
  challenge: Challenge;
  state?: ChallengeProgressState;
  /** Whole save for the star and recommendation selectors; optional in tests. */
  save?: SaveV1;
  now?: Date;
  onRun: (files: CodeFiles) => Promise<RunResult> | RunResult;
  dispatch: (event: ProgressEvent) => Outcome;
}

const TABS = ['html', 'css', 'js'] as const;

const TAB_LABELS: Record<EditorLanguage, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JS',
};

const EDITOR_LABELS: Record<EditorLanguage, string> = {
  html: 'Código HTML',
  css: 'Código CSS',
  js: 'Código JavaScript',
};

const KIND_LABELS: Record<Challenge['kind'], string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
};

const SAVE_DEBOUNCE_MS = 600;
const FAILURES_TO_UNLOCK = 3;
const NO_STARS: Stars = { quiz: false, cards: false, code: false };

/** Static content for the star and recommendation selectors. */
const CHALLENGE_CONTENT: ProgressContent = {
  questions: Object.fromEntries(
    NODES.map((node) => [node.id, getQuestions(node.id)]),
  ),
  flashcards: Object.fromEntries(
    NODES.map((node) => [node.id, getFlashcards(node.id)]),
  ),
  challenges: Object.fromEntries(
    NODES.map((node) => [node.id, getChallenges(node.id)]),
  ),
};

/**
 * The "Próximo passo" target after a passing run: the first challenge of the
 * same node that is still unpassed, else the node recommended by progress.
 */
export function getChallengeNextHref(
  challenge: Pick<Challenge, 'id' | 'nodeId'>,
  save: SaveV1 | undefined,
  content: ProgressContent = CHALLENGE_CONTENT,
  now: Date = new Date(),
): string {
  const next = getChallenges(challenge.nodeId).find(
    (candidate) =>
      candidate.id !== challenge.id &&
      save?.challenges[candidate.id]?.passed !== true,
  );

  if (next) return `/desafio/${next.id}`;

  return `/no/${
    save ? getRecommendedNodeId(save, content, now) : challenge.nodeId
  }`;
}

/** A copy of the save with the just-passed challenge marked as passed. */
function withChallengePassed(
  save: SaveV1,
  challengeId: string,
): SaveV1 {
  const previous = save.challenges[challengeId];
  const passed: ChallengeProgressState = {
    passed: true,
    failedRuns: previous?.failedRuns ?? 0,
    hintsUsed: previous?.hintsUsed ?? 0,
    xpAwarded: previous?.xpAwarded ?? 0,
    code: previous?.code ?? null,
  };

  return {
    ...save,
    challenges: { ...save.challenges, [challengeId]: passed },
  };
}

/**
 * The interactive challenge surface: editor tabs, live preview, requirement
 * checklist, sequential hints and the guarded solution. The page owns the
 * sandbox and supplies `onRun`; `dispatch` reaches the progress provider.
 */
export function ChallengeView({
  challenge,
  state,
  save,
  now = new Date(),
  onRun,
  dispatch,
}: ChallengeViewProps) {
  const [activeTab, setActiveTab] = useState<EditorLanguage>(challenge.kind);
  const [files, setFiles] = useState<CodeFiles>(
    () => state?.code ?? challenge.starter,
  );
  const [results, setResults] = useState<RequirementResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<'pass' | 'fail' | null>(null);
  const [localPassed, setLocalPassed] = useState(false);
  const [localFailedRuns, setLocalFailedRuns] = useState(0);
  const [localHints, setLocalHints] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    xp: number;
    starsBefore: Stars;
    starsAfter: Stars;
    nextHref: string;
  } | null>(null);

  const passed = (state?.passed ?? false) || localPassed;
  const failedRuns = Math.max(state?.failedRuns ?? 0, localFailedRuns);
  const hintsUsed = Math.max(state?.hintsUsed ?? 0, localHints);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
      }
    },
    [],
  );

  const scheduleSave = useCallback(
    (code: CodeFiles) => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = undefined;
        dispatch({
          type: 'challenge/saveCode',
          challengeId: challenge.id,
          code,
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [challenge.id, dispatch],
  );

  const updateFile = useCallback(
    (value: string) => {
      const next = { ...files, [activeTab]: value };
      setFiles(next);
      scheduleSave(next);
    },
    [activeTab, files, scheduleSave],
  );

  const handleReset = useCallback(() => {
    if (saveTimer.current !== undefined) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
    }
    setFiles(challenge.starter);
    setResults(null);
    setLastRun(null);
    setRunError(null);
    scheduleSave(challenge.starter);
  }, [challenge.starter, scheduleSave]);

  const handleRun = useCallback(async () => {
    if (running) {
      return;
    }

    setRunning(true);
    setRunError(null);

    let runResults: RequirementResult[];
    try {
      const result = await Promise.resolve(onRun(files));
      runResults = result.requirements;
    } catch {
      runResults = challenge.requirements.map((requirement) => ({
        id: requirement.id,
        passed: false,
      }));
      setRunError('Não foi possível executar os testes. Tente novamente.');
    }

    const didPass = challenge.requirements.every((requirement) =>
      runResults.some(
        (result) => result.id === requirement.id && result.passed,
      ),
    );

    setResults(runResults);
    setLastRun(didPass ? 'pass' : 'fail');
    if (didPass) {
      setLocalPassed(true);
    } else {
      setLocalFailedRuns((current) => current + 1);
    }

    const outcome: Outcome | undefined = dispatch({
      type: 'challenge/run',
      nodeId: challenge.nodeId,
      challengeId: challenge.id,
      passed: didPass,
    });

    // The summary belongs to the first pass of the visit: later passing runs
    // keep the passed checklist but do not reopen it.
    if (didPass && !passed) {
      setSummary({
        xp: outcome?.xpGained ?? 0,
        starsBefore: save
          ? getStars(save, challenge.nodeId, CHALLENGE_CONTENT)
          : NO_STARS,
        starsAfter: save
          ? getStars(
              withChallengePassed(save, challenge.id),
              challenge.nodeId,
              CHALLENGE_CONTENT,
            )
          : NO_STARS,
        nextHref: getChallengeNextHref(
          challenge,
          save,
          CHALLENGE_CONTENT,
          now,
        ),
      });
    }

    setRunning(false);
  }, [challenge, dispatch, files, now, onRun, passed, running, save]);

  const handleHint = useCallback(
    (tier: HintTier) => {
      setLocalHints((current) => Math.max(current, tier));
      dispatch({
        type: 'challenge/hint',
        nodeId: challenge.nodeId,
        challengeId: challenge.id,
        tier,
      });
    },
    [challenge.id, challenge.nodeId, dispatch],
  );

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (index + 1) % TABS.length;
          break;
        case 'ArrowLeft':
          nextIndex = (index - 1 + TABS.length) % TABS.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = TABS.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextTab = TABS[nextIndex];
      if (nextTab !== undefined) {
        setActiveTab(nextTab);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [],
  );

  const solutionUnlocked = passed || failedRuns >= FAILURES_TO_UNLOCK;

  return (
    <article className="challenge-view session-page session-page--wide">
      <header className="challenge-view__header">
        <div className="challenge-view__heading">
          <p className="challenge-view__eyebrow">
            Desafio de {KIND_LABELS[challenge.kind]}
          </p>
          <h1 className="challenge-view__title">{challenge.title}</h1>
          <p className="challenge-view__goal">{challenge.goal}</p>
        </div>
        <Link className="challenge-view__node-link" to={`/no/${challenge.nodeId}`}>
          Ver nó {challenge.nodeId}
        </Link>
      </header>

      <div className="challenge-view__grid">
        <PixelPanel
          as="section"
          className="challenge-view__editor"
          aria-label="Editor de código"
        >
          <div
            className="challenge-view__tabs"
            role="tablist"
            aria-label="Arquivo do editor"
          >
            {TABS.map((tab, index) => (
              <button
                key={tab}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`challenge-tab-${tab}`}
                className="challenge-view__tab"
                aria-selected={activeTab === tab}
                aria-controls={`challenge-panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div
            className="challenge-view__panel"
            role="tabpanel"
            id={`challenge-panel-${activeTab}`}
            aria-labelledby={`challenge-tab-${activeTab}`}
          >
            <CodeEditor
              key={activeTab}
              language={activeTab}
              value={files[activeTab]}
              onChange={updateFile}
              onRun={() => {
                void handleRun();
              }}
              label={EDITOR_LABELS[activeTab]}
            />
          </div>

          <p className="challenge-view__keyboard-hint">
            Esc e depois Tab sai do editor. Ctrl+Enter executa os testes.
          </p>

          <div className="challenge-view__actions">
            <Button onClick={() => void handleRun()} disabled={running}>
              {running ? 'Executando…' : 'Executar testes'}
            </Button>
            <Button variant="quiet" onClick={handleReset}>
              Restaurar código inicial
            </Button>
          </div>

          {runError ? (
            <p className="challenge-view__error" role="alert">
              {runError}
            </p>
          ) : null}
        </PixelPanel>

        <section className="challenge-view__preview" aria-label="Prévia">
          <div className="challenge-view__device">
            <div className="challenge-view__device-bar" aria-hidden="true">
              <span className="challenge-view__device-label">
                Prévia ao vivo
              </span>
            </div>
            <div className="challenge-view__device-screen">
              <SandboxFrame
                files={files}
                libs={challenge.libs}
                mocks={challenge.mocks}
                title="Prévia do desafio"
              />
            </div>
          </div>
        </section>

        <aside className="challenge-view__sidebar">
          <RequirementList
            requirements={challenge.requirements}
            results={results}
            running={running}
          />

          <HintPanel
            hints={challenge.hints}
            hintsUsed={hintsUsed}
            onReveal={handleHint}
          />

          <details className="challenge-view__solution">
            <summary className="challenge-view__solution-title">
              Solução
              <span className="challenge-view__solution-state">
                {solutionUnlocked ? 'liberada' : 'bloqueada'}
              </span>
            </summary>
            <div className="challenge-view__solution-body">
              <Button
                variant="quiet"
                disabled={!solutionUnlocked}
                onClick={() => setSolutionVisible(true)}
              >
                Ver solução
              </Button>
              {!solutionUnlocked ? (
                <p className="challenge-view__solution-lock">
                  Disponível após 3 tentativas
                </p>
              ) : null}
              {solutionVisible && solutionUnlocked ? (
                <div className="challenge-view__solution-panel">
                  {(['html', 'css', 'js'] as const).map((language) => (
                    <div key={language}>
                      <h3>{TAB_LABELS[language]}</h3>
                      <pre>
                        <code>{challenge.solution[language]}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>

        </aside>
      </div>

      {lastRun !== null ? (
        <FeedbackBar
          className="challenge-view__feedback"
          verdict={lastRun === 'pass' ? 'correct' : 'wrong'}
          continueLabel="Fechar"
          onContinue={() => setLastRun(null)}
        >
          <p className="challenge-view__feedback-message">
            {lastRun === 'pass'
              ? 'Todos os requisitos foram cumpridos.'
              : 'Revise os requisitos e tente de novo.'}
          </p>
        </FeedbackBar>
      ) : null}

      <Dialog
        open={summary !== null}
        title="Desafio concluído"
        onClose={() => setSummary(null)}
      >
        {summary ? (
          <SessionSummary
            title="Todos os requisitos cumpridos"
            xp={summary.xp}
            stats={[
              {
                label: 'Requisitos',
                value: `${challenge.requirements.length} de ${challenge.requirements.length}`,
              },
            ]}
            starsBefore={summary.starsBefore}
            starsAfter={summary.starsAfter}
            nextHref={summary.nextHref}
            mascotMood="happy"
            secondary={
              <Button variant="quiet" onClick={() => setSummary(null)}>
                Continuar editando
              </Button>
            }
          />
        ) : null}
      </Dialog>
    </article>
  );
}
