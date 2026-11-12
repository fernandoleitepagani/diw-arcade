import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { Button, Mascot, StarRating } from '../../components/ui';
import {
  getChallenges,
  getFlashcards,
  getNode,
  getQuestions,
  UNITS,
  type NodeId,
} from '../../content';
import { pickLine } from '../../content/copy';
import type { Outcome } from '../../lib/progress/events';
import {
  getDueCountByNode,
  getStars,
  getStarCount,
} from '../../lib/progress/selectors';
import { createEmptySave } from '../../lib/storage';
import './NodePage.css';

const DECK_RULE =
  'Introduz agora todas as cartas novas deste nó, além do limite diário. Elas contam no total de novas de hoje.';

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
 * The provider is the normal path. Isolated route rendering (the route smoke
 * tests) has no provider, so fall back to an empty save and a no-op dispatch.
 */
function useOptionalProgress(): ProgressContextValue | null {
  try {
    return useProgress();
  } catch {
    return null;
  }
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function NodePage() {
  usePageTitle('Nó');
  const { nodeId: rawNodeId } = useParams();
  const progress = useOptionalProgress();
  const save = progress?.save ?? ISOLATED_SAVE;
  const dispatch = progress?.dispatch ?? NOOP_DISPATCH;
  const now = progress?.now ?? ISOLATED_NOW;
  const [added, setAdded] = useState<{ nodeId: string; count: number } | null>(
    null,
  );

  const node = rawNodeId ? getNode(rawNodeId as NodeId) : undefined;

  if (!node) {
    return (
      <section className="page node-page">
        <h1>Nó não encontrado</h1>
        <p>O endereço não corresponde a nenhum nó da árvore.</p>
        <Link to="/">Voltar para a árvore</Link>
      </section>
    );
  }

  const nodeId = node.id;
  const questions = getQuestions(nodeId);
  const flashcards = getFlashcards(nodeId);
  const challenges = getChallenges(nodeId);
  const content = {
    questions: { [nodeId]: questions },
    flashcards: { [nodeId]: flashcards },
    challenges: { [nodeId]: challenges },
  };

  const stars = getStars(save, nodeId, content);
  const starCount = getStarCount(stars);
  const dueCount = getDueCountByNode(save, content, now)[nodeId] ?? 0;
  const newCount = flashcards.filter(
    (flashcard) => save.cards[flashcard.id] === undefined,
  ).length;
  const unitTitle = UNITS.find((unit) => unit.id === node.unitId)?.title;

  const isEmpty =
    questions.length === 0 &&
    flashcards.length === 0 &&
    challenges.length === 0;

  function introduceDeck(): void {
    if (newCount === 0) return;
    const count = newCount;
    dispatch({ type: 'deck/introduce', nodeId });
    setAdded({ nodeId, count });
  }

  return (
    <section className="page node-page">
      <header className="node-page__header">
        {unitTitle ? <p className="node-page__unit">{unitTitle}</p> : null}
        <h1>Nó</h1>
        <h2>{node.title}</h2>
        <p className="node-page__aulas">
          Aulas: {node.aulas.join(', ')}
        </p>
        <StarRating stars={starCount} />
      </header>

      {isEmpty ? (
        <div className="node-page__empty">
          <h2>Conteúdo em breve</h2>
          <Mascot mood="idle" line={pickLine('empty', 0)} size={96} />
        </div>
      ) : (
        <div className="node-page__modes">
          <article className="node-mode">
            <h3 className="node-mode__title">
              <Link to={`/no/${nodeId}/quiz`}>Quiz</Link>
            </h3>
            <p className="node-mode__meta">
              {plural(questions.length, 'pergunta', 'perguntas')}
            </p>
            <p className="node-mode__note">
              {stars.quiz
                ? 'Estrela de quiz conquistada.'
                : 'Acerte 80% de primeira para acender a estrela.'}
            </p>
          </article>

          <article className="node-mode">
            <h3 className="node-mode__title">
              <Link to={`/no/${nodeId}/cartas`}>Cartas</Link>
            </h3>
            <p className="node-mode__meta">
              {plural(dueCount, 'devida', 'devidas')} ·{' '}
              {plural(newCount, 'nova', 'novas')}
            </p>
            <Button
              variant="secondary"
              onClick={introduceDeck}
              disabled={newCount === 0}
              aria-describedby={`deck-rule-${nodeId}`}
            >
              {`Adicionar baralho inteiro (${plural(
                newCount,
                'carta nova',
                'cartas novas',
              )})`}
            </Button>
            <p className="node-mode__rule" id={`deck-rule-${nodeId}`}>
              {DECK_RULE}
            </p>
            {added?.nodeId === nodeId ? (
              <p className="node-mode__status" role="status">
                {plural(added.count, 'carta adicionada', 'cartas adicionadas')}
              </p>
            ) : null}
          </article>

          <article className="node-mode">
            <h3 className="node-mode__title">Código</h3>
            {challenges.length > 0 ? (
              <ul className="node-mode__challenges">
                {challenges.map((challenge) => (
                  <li key={challenge.id}>
                    <Link to={`/desafio/${challenge.id}`}>
                      {challenge.title}
                    </Link>
                    {save.challenges[challenge.id]?.passed ? (
                      <span className="node-mode__passed"> · concluído</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="node-mode__note">
                Nenhum desafio neste nó ainda.
              </p>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
