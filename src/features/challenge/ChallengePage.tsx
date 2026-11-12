import { useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { useProgress } from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { getChallenge } from '../../content';
import type { Challenge, CodeFiles } from '../../content/schema';
import { runInIframe, type RunResult } from '../runner/runner';
import { ChallengeView } from './ChallengeView';

interface ChallengeRunnerProps {
  challenge: Challenge;
}

/**
 * The progress-aware half of the page. Kept separate so an unknown challenge
 * can render its fallback without depending on the progress provider.
 */
function ChallengeRunner({ challenge }: ChallengeRunnerProps) {
  const { save, dispatch } = useProgress();
  const runnerRef = useRef<HTMLDivElement>(null);

  const runTests = useCallback(
    async (files: CodeFiles): Promise<RunResult> => {
      const container = runnerRef.current;
      if (!container) {
        return { status: 'ok', requirements: [], errors: [] };
      }

      container.replaceChildren();
      const { iframe, result } = runInIframe(container, files, {
        mode: 'test',
        requirements: challenge.requirements,
        mocks: challenge.mocks,
        libs: challenge.libs,
      });
      iframe.title = 'Execução dos testes';
      try {
        return await result;
      } finally {
        container.replaceChildren();
      }
    },
    [challenge],
  );

  return (
    <>
      <ChallengeView
        key={challenge.id}
        challenge={challenge}
        state={save.challenges[challenge.id]}
        onRun={runTests}
        dispatch={dispatch}
      />
      <div
        className="challenge-page__runner"
        ref={runnerRef}
        aria-hidden="true"
      />
    </>
  );
}

export function ChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const challenge = challengeId ? getChallenge(challengeId) : undefined;

  usePageTitle(challenge ? challenge.title : 'Desafio');

  if (!challenge) {
    return (
      <section className="page">
        <h1>Desafio</h1>
        <p>Esse desafio não existe ou ainda não faz parte do conteúdo.</p>
        <Link to="/">Voltar para a árvore</Link>
      </section>
    );
  }

  return <ChallengeRunner challenge={challenge} />;
}
