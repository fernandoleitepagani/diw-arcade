import { useState } from 'react';
import { Link } from 'react-router';
import type { Challenge, NodeId, Primer } from '../../content';
import { Button, ButtonLink } from '../../components/pixel/Button/Button';
import { Row } from '../../components/pixel/Row/Row';
import { PrimerView, readMinutes } from './PrimerView';
import { plural, type UnitLab } from './stepCounts';

export { plural };

const DECK_RULE =
  'Introduz agora todas as cartas novas deste nó, além do limite diário. Elas contam no total de novas de hoje.';

const KIND_LABEL: Readonly<Record<Challenge['kind'], string>> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
};

/** The Ler layout body (`?passo=ler`): numbered points, then the way out. */
export function LerPanel({
  primer,
  read,
  onRead,
  nextHref,
}: {
  primer: Primer | undefined;
  read: boolean;
  onRead: () => void;
  /** Where "Continuar para o quiz" goes once the reading is done. */
  nextHref?: string;
}) {
  const [clicked, setClicked] = useState(false);
  const done = read || clicked;
  return (
    <div className="lesson-panel lesson-panel--ler">
      {primer === undefined ? (
        <p className="lesson-panel__note">Resumo ainda não disponível</p>
      ) : (
        <>
          <PrimerView primer={primer} />
          {done ? (
            <>
              <p className="lesson-panel__note">Leitura concluída</p>
              {nextHref ? (
                <ButtonLink to={nextHref}>Continuar para o quiz</ButtonLink>
              ) : null}
            </>
          ) : (
            <Button
              onClick={() => {
                setClicked(true);
                onRead();
              }}
            >
              Concluir leitura
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** Lição stage for the Ler step; the reading itself lives in `?passo=ler`. */
export function LerStage({ primer }: { primer: Primer | undefined }) {
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Ler</h2>
      <p className="lesson-panel__note">
        {primer === undefined
          ? 'Resumo ainda não disponível'
          : `${plural(primer.points.length, 'ponto', 'pontos')} para ler, cerca de ${plural(
              readMinutes(primer),
              'minuto',
              'minutos',
            )}. Leia antes de praticar.`}
      </p>
    </div>
  );
}

export function PraticarPanel({
  nodeId,
  questionCount,
  starOn,
  best,
}: {
  nodeId: NodeId;
  questionCount: number;
  starOn: boolean;
  best: { right: number; total: number } | null;
}) {
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Praticar</h2>
      <p className="lesson-panel__note">
        {plural(questionCount, 'pergunta', 'perguntas')} neste nó.{' '}
        {best
          ? `Sua melhor rodada: ${best.right} de ${best.total} certas de primeira. `
          : ''}
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
  cardCount,
  dueCount,
  newCount,
  best,
  onIntroduceDeck,
}: {
  nodeId: NodeId;
  cardCount: number;
  dueCount: number;
  newCount: number;
  best: { right: number; total: number } | null;
  onIntroduceDeck: () => number;
}) {
  const [added, setAdded] = useState<number | null>(null);
  const ruleId = `deck-rule-${nodeId}`;
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Fixar</h2>
      <p className="lesson-panel__note">
        {plural(cardCount, 'carta', 'cartas')}, {dueCount} para revisar hoje,{' '}
        {plural(newCount, 'nova', 'novas')}.
        {best && best.right < best.total
          ? ` Você acertou ${best.right} de ${best.total} no quiz, então vale fixar o que errou.`
          : ''}
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
  labs,
}: {
  challenges: readonly Challenge[];
  passed: ReadonlySet<string>;
  labs: readonly UnitLab[];
}) {
  const doneCount = challenges.filter((c) => passed.has(c.id)).length;
  return (
    <div className="lesson-panel">
      <h2 className="lesson-panel__title">Construir</h2>
      {challenges.length > 0 ? (
        <>
          <p className="lesson-panel__note">
            {plural(challenges.length, 'desafio', 'desafios')} de código,{' '}
            {doneCount} {doneCount === 1 ? 'concluído' : 'concluídos'}.
          </p>
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
        </>
      ) : (
        <p className="lesson-panel__note">Nenhum desafio neste nó ainda.</p>
      )}
      {labs.length > 0 ? (
        <section className="lesson-panel__labs">
          <h3>Projetos da unidade</h3>
          <div className="lesson-panel__lablist">
            {labs.map((lab) => (
              <Row
                key={lab.id}
                icon="braces"
                action={{
                  label: 'Abrir',
                  ariaLabel: `Abrir ${lab.title}`,
                  to: `/laboratorios/${lab.id}`,
                }}
              >
                <b className="lesson-panel__lab-title">{lab.title}</b>
                <span className="lesson-panel__lab-status">{lab.status}</span>
              </Row>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
