import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { NODE_IDS, getQuestions, type NodeId } from '../../content';
import { QuizRound } from './QuizRound';

function isNodeId(value: string | undefined): value is NodeId {
  return value !== undefined && (NODE_IDS as readonly string[]).includes(value);
}

/**
 * The route smoke test renders pages without the progress provider. Reading
 * progress is optional here so the quiz can mount in isolation; in the app the
 * provider is always present through <App>.
 */
function useOptionalProgress(): ProgressContextValue | null {
  try {
    return useProgress();
  } catch {
    return null;
  }
}

export function QuizPage() {
  usePageTitle('Quiz');

  const params = useParams();
  const navigate = useNavigate();
  const [round, setRound] = useState(0);
  const progress = useOptionalProgress();

  const nodeId = isNodeId(params.nodeId) ? params.nodeId : null;
  const questions = nodeId ? getQuestions(nodeId) : [];

  return (
    <section className="page">
      <h1>Quiz</h1>
      {nodeId && questions.length > 0 ? (
        <QuizRound
          key={round}
          nodeId={nodeId}
          questions={questions}
          answers={progress?.save.quiz.answers}
          dispatch={progress?.dispatch}
          onRestart={() => setRound((value) => value + 1)}
          onExit={() => navigate(`/no/${nodeId}`)}
        />
      ) : (
        <p>Conteúdo em breve</p>
      )}
    </section>
  );
}
