import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import {
  Badge,
  Button,
  Card,
  Mascot,
  PageHeader,
  StarRating,
  type BadgeTone,
} from '../../components/ui';
import {
  getChallenges,
  getFlashcards,
  getNode,
  getQuestions,
  UNITS,
  type Challenge,
  type NodeId,
} from '../../content';
import { pickLine } from '../../content/copy';
import type { Outcome } from '../../lib/progress/events';
import { getDueCountByNode, getStars } from '../../lib/progress/selectors';
import { createEmptySave } from '../../lib/storage';
import {
  getNodeState,
  NODE_STATE_LABEL,
  type NodeState,
} from './nodeState';
import './NodePage.css';

const DECK_RULE =
  'Introduz agora todas as cartas novas deste nó, além do limite diário. Elas contam no total de novas de hoje.';

const KIND_LABEL: Readonly<Record<Challenge['kind'], string>> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
};

const STATE_TONE: Readonly<Record<NodeState, BadgeTone>> = {
  nova: 'neutral',
  'em-progresso': 'accent',
  dominada: 'success',
};

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
  const { nodeId: rawNodeId } = useParams();
  const node = rawNodeId ? getNode(rawNodeId as NodeId) : undefined;
  usePageTitle(node ? node.title : 'Nó');
  const progress = useOptionalProgress();
  const save = progress?.save ?? ISOLATED_SAVE;
  const dispatch = progress?.dispatch ?? NOOP_DISPATCH;
  const now = progress?.now ?? ISOLATED_NOW;
  const [added, setAdded] = useState<{ nodeId: string; count: number } | null>(
    null,
  );

  if (!node) {
    return (
      <section className="page node-page">
        <PageHeader
          eyebrow="Trilha"
          title="Nó não encontrado"
          description="O endereço não corresponde a nenhum nó da árvore."
        />
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
  const state = getNodeState(save, nodeId, content);
  const dueCount = getDueCountByNode(save, content, now)[nodeId] ?? 0;
  const newCount = flashcards.filter(
    (flashcard) => save.cards[flashcard.id] === undefined,
  ).length;
  const unit = UNITS.find((candidate) => candidate.id === node.unitId);

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
      <PageHeader
        className="node-page__header"
        eyebrow={unit ? `Unidade ${unit.id.slice(1)} · ${unit.title}` : 'Trilha'}
        title={node.title}
        meta={
          <>
            <span className="node-page__aulas">
              Aulas: {node.aulas.join(', ')}
            </span>
            <Badge tone={STATE_TONE[state]}>{NODE_STATE_LABEL[state]}</Badge>
            <StarRating
              modes={stars}
              showLabels
              size="lg"
              className="node-page__stars"
            />
          </>
        }
      />

      {isEmpty ? (
        <Card as="section" className="node-page__empty">
          <h2>Conteúdo em breve</h2>
          <Mascot mood="idle" line={pickLine('empty', 0)} size={96} />
        </Card>
      ) : (
        <div className="node-page__modes l-grid">
          <Card
            as="article"
            className="node-mode"
            aria-labelledby={`node-mode-quiz-${nodeId}`}
          >
            <h2 className="node-mode__title" id={`node-mode-quiz-${nodeId}`}>
              Quiz
            </h2>
            <div className="node-mode__content">
              <p className="node-mode__meta">
                {plural(questions.length, 'pergunta', 'perguntas')}
              </p>
              <p className="node-mode__note">
                {stars.quiz
                  ? 'Estrela de quiz conquistada.'
                  : 'Acerte 80% de primeira para acender a estrela.'}
              </p>
            </div>
            <Link
              className="ui-button ui-button--primary node-mode__action"
              to={`/no/${nodeId}/quiz`}
            >
              Começar quiz
            </Link>
          </Card>

          <Card
            as="article"
            className="node-mode"
            aria-labelledby={`node-mode-cards-${nodeId}`}
          >
            <h2 className="node-mode__title" id={`node-mode-cards-${nodeId}`}>
              Cartas
            </h2>
            <div className="node-mode__content">
              <p className="node-mode__meta">
                {plural(dueCount, 'devida', 'devidas')} ·{' '}
                {plural(newCount, 'nova', 'novas')}
              </p>
            </div>
            <Link
              className="ui-button ui-button--primary node-mode__action"
              to={`/no/${nodeId}/cartas`}
            >
              Revisar cartas
            </Link>
            <div className="node-mode__secondary">
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
                  {plural(
                    added.count,
                    'carta adicionada',
                    'cartas adicionadas',
                  )}
                </p>
              ) : null}
            </div>
          </Card>

          <Card
            as="article"
            className="node-mode node-mode--code"
            aria-labelledby={`node-mode-code-${nodeId}`}
          >
            <h2 className="node-mode__title" id={`node-mode-code-${nodeId}`}>
              Código
            </h2>
            {challenges.length > 0 ? (
              <ul className="node-mode__challenges">
                {challenges.map((challenge) => {
                  const passed = save.challenges[challenge.id]?.passed === true;
                  return (
                    <li key={challenge.id}>
                      <Link
                        className={`node-mode__challenge ${
                          passed
                            ? 'node-mode__challenge--done'
                            : 'node-mode__challenge--pending'
                        }`}
                        to={`/desafio/${challenge.id}`}
                      >
                        <span
                          className="node-mode__marker"
                          aria-hidden="true"
                        >
                          {passed ? '✓' : '○'}
                        </span>
                        <span className="sr-only">
                          {passed ? 'concluído' : 'pendente'}
                        </span>
                        <span className="node-mode__challenge-title">
                          {challenge.title}
                        </span>
                        <Badge className="node-mode__kind">
                          {KIND_LABEL[challenge.kind]}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="node-mode__note">
                Nenhum desafio neste nó ainda.
              </p>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}
