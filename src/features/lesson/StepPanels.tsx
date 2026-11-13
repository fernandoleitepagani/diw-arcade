import { useState } from 'react';
import { Link } from 'react-router';
import type { Challenge, NodeId } from '../../content';
import { Button, ButtonLink } from '../../components/pixel/Button/Button';

const DECK_RULE =
  'Introduz agora todas as cartas novas deste nó, além do limite diário. Elas contam no total de novas de hoje.';

const KIND_LABEL: Readonly<Record<Challenge['kind'], string>> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
};

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function LerPanel() {
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Ler</h2>
      <p className="lesson-panel__note">Em breve</p>
    </div>
  );
}

export function PraticarPanel({
  nodeId,
  questionCount,
  starOn,
}: {
  nodeId: NodeId;
  questionCount: number;
  starOn: boolean;
}) {
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Praticar</h2>
      <p className="lesson-panel__meta">
        {plural(questionCount, 'pergunta', 'perguntas')}
      </p>
      <p className="lesson-panel__note">
        {starOn
          ? 'Estrela de quiz conquistada.'
          : 'Acerte 80% de primeira para acender a estrela.'}
      </p>
      <ButtonLink to={`/no/${nodeId}/quiz`}>Começar quiz</ButtonLink>
    </div>
  );
}

export function FixarPanel({
  nodeId,
  dueCount,
  newCount,
  onIntroduceDeck,
}: {
  nodeId: NodeId;
  dueCount: number;
  newCount: number;
  onIntroduceDeck: () => number;
}) {
  const [added, setAdded] = useState<number | null>(null);
  const ruleId = `deck-rule-${nodeId}`;
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Fixar</h2>
      <p className="lesson-panel__meta">
        {plural(dueCount, 'devida', 'devidas')},{' '}
        {plural(newCount, 'nova', 'novas')}
      </p>
      <ButtonLink to={`/no/${nodeId}/cartas`}>Revisar cartas</ButtonLink>
      <div className="lesson-panel__secondary">
        <Button
          variant="quiet"
          onClick={() => setAdded(onIntroduceDeck())}
          disabled={newCount === 0}
          aria-describedby={ruleId}
        >
          {`Adicionar baralho inteiro (${plural(
            newCount,
            'carta nova',
            'cartas novas',
          )})`}
        </Button>
        <p className="lesson-panel__note" id={ruleId}>
          {DECK_RULE}
        </p>
        {added !== null ? (
          <p className="lesson-panel__status" role="status">
            {plural(added, 'carta adicionada', 'cartas adicionadas')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ConstruirPanel({
  challenges,
  passed,
}: {
  challenges: readonly Challenge[];
  passed: ReadonlySet<string>;
}) {
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Construir</h2>
      {challenges.length > 0 ? (
        <ul className="lesson-panel__challenges">
          {challenges.map((challenge) => {
            const done = passed.has(challenge.id);
            return (
              <li key={challenge.id}>
                <Link
                  className="lesson-panel__challenge"
                  to={`/desafio/${challenge.id}`}
                >
                  <span aria-hidden="true">{done ? '✓' : '○'}</span>
                  <span className="lesson-panel__challenge-title">
                    {challenge.title}
                  </span>
                  <span className="lesson-panel__kind">
                    {KIND_LABEL[challenge.kind]}
                  </span>
                  <span className="lesson-panel__state">
                    {done ? 'concluído' : 'pendente'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lesson-panel__note">Nenhum desafio neste nó ainda.</p>
      )}
    </div>
  );
}
