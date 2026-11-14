import { Link, useParams, useSearchParams } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { ButtonLink } from '../../components/pixel/Button/Button';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { SegBar } from '../../components/pixel/SegBar/SegBar';
import { Tag } from '../../components/pixel/Tag/Tag';
import {
  getChallenges,
  getFlashcards,
  getNode,
  getQuestions,
  UNITS,
  type NodeId,
} from '../../content';
import { hasPrimer } from '../../content/primers';
import {
  firstUnfinishedStep,
  getLessonSteps,
  LESSON_STEP_IDS,
  type LessonStepId,
} from '../../lib/progress/lessonSteps';
import type { Outcome } from '../../lib/progress/events';
import {
  getDueCountByNode,
  getPrimersRead,
  getStars,
} from '../../lib/progress/selectors';
import { createEmptySave } from '../../lib/storage';
import { usePrimer } from '../lesson/usePrimer';
import { Domina } from '../lesson/Domina';
import { LessonStepper, STEP_LABEL } from '../lesson/LessonStepper';
import { getCardMastery, getMasteryStars } from '../lesson/masteryState';
import { readMinutes } from '../lesson/PrimerView';
import {
  ConstruirPanel,
  FixarPanel,
  LerPanel,
  LerStage,
  plural,
  PraticarPanel,
} from '../lesson/StepPanels';
import {
  getBestRound,
  getStepCounts,
  getUnitLabs,
} from '../lesson/stepCounts';
import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import { UNIT_COLOR } from '../../styles/unitColors';
import '../lesson/lesson.css';

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

function isStepId(value: string | null): value is LessonStepId {
  return (LESSON_STEP_IDS as readonly string[]).includes(value ?? '');
}

export function NodePage() {
  const { nodeId: rawNodeId } = useParams();
  const [searchParams] = useSearchParams();
  const node = rawNodeId ? getNode(rawNodeId as NodeId) : undefined;
  usePageTitle(node ? node.title : 'Nó');
  const primer = usePrimer(node?.id);
  const progress = useOptionalProgress();
  const save = progress?.save ?? ISOLATED_SAVE;
  const dispatch = progress?.dispatch ?? NOOP_DISPATCH;
  const now = progress?.now ?? ISOLATED_NOW;

  if (!node) {
    return (
      <section className="page lesson">
        <PixelPanel as="section" className="lesson__stage">
          <h1 className="lesson__title">Nó não encontrado</h1>
          <p>O endereço não corresponde a nenhum nó da árvore.</p>
          <Link className="lesson__back" to="/trilha">
            ← Trilha
          </Link>
        </PixelPanel>
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
  const mastery = getMasteryStars(stars);
  const steps = getLessonSteps(save, nodeId, content, {
    hasPrimer: hasPrimer(nodeId),
    primersRead: getPrimersRead(save) as ReadonlySet<NodeId>,
  });
  const next = firstUnfinishedStep(steps);
  const requested = searchParams.get('passo');
  const current: LessonStepId = isStepId(requested)
    ? requested
    : (next ?? LESSON_STEP_IDS.find((id) => steps[id] !== 'indisponivel') ?? 'ler');

  // Praticar and Fixar already carry the primary action ("Começar quiz",
  // "Revisar cartas") for the step "Continuar" would reopen.
  const coversNext =
    next === current && (current === 'praticar' || current === 'fixar');

  const dueCount = getDueCountByNode(save, content, now)[nodeId] ?? 0;
  const newCount = flashcards.filter(
    (flashcard) => save.cards[flashcard.id] === undefined,
  ).length;
  const unit = UNITS.find((candidate) => candidate.id === node.unitId);
  const passed = new Set(
    challenges
      .filter((challenge) => save.challenges[challenge.id]?.passed === true)
      .map((challenge) => challenge.id),
  );
  const isEmpty =
    questions.length === 0 &&
    flashcards.length === 0 &&
    challenges.length === 0;

  function introduceDeck(): number {
    const count = newCount;
    if (count > 0) dispatch({ type: 'deck/introduce', nodeId });
    return count;
  }

  const primerPoints = primer?.points.length;
  const counts = getStepCounts(save, nodeId, content, {
    now,
    primerPoints,
  });
  if (hasPrimer(nodeId) && primer === undefined) counts.ler = 'resumo';
  const best = getBestRound(save, nodeId, questions.length);
  const unitColor = unit ? UNIT_COLOR[unit.id] : undefined;
  const aulas = `${node.aulas.length === 1 ? 'aula' : 'aulas'} ${node.aulas.join(', ')}`;
  const stepper = (
    <LessonStepper
      nodeId={nodeId}
      steps={steps}
      current={current}
      counts={counts}
      color={unitColor}
    />
  );

  if (requested === 'ler') {
    return (
      <section className="page lesson lesson--ler">
        <div className="lesson__crumb">
          <Link className="lesson__back" to={`/no/${nodeId}`}>
            <PixelIcon name="left" />
            {node.title}
          </Link>
        </div>
        {stepper}
        <div className="lesson__prose">
          <h1>{node.title}</h1>
          <p className="lesson__meta">
            {primer ? (
              <>
                <span>{plural(primer.points.length, 'ponto', 'pontos')}</span>
                <span>
                  cerca de {plural(readMinutes(primer), 'minuto', 'minutos')}
                </span>
              </>
            ) : null}
            {unit ? <Tag unit={unit.id}>{unit.title}</Tag> : null}
          </p>
          <LerPanel
            primer={primer}
            read={steps.ler === 'feito'}
            onRead={() => dispatch({ type: 'primer/read', nodeId })}
            nextHref={`/no/${nodeId}/quiz`}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page lesson">
      <div className="lesson__crumb">
        <Link className="lesson__back" to="/trilha">
          <PixelIcon name="left" />
          Trilha
        </Link>
      </div>
      <div className="lesson__lead">
        <h1>{node.title}</h1>
        {unit ? <Tag unit={unit.id}>{`${unit.title}, ${aulas}`}</Tag> : null}
        <div className="lesson__mastery">
          <p>{mastery.text}</p>
          <SegBar
            on={mastery.on}
            total={mastery.total}
            label={mastery.text}
            color={unitColor}
          />
        </div>
      </div>

      {isEmpty ? (
        <PixelPanel as="section" className="lesson__stage">
          <h2 className="lesson-panel__title">Conteúdo em breve</h2>
        </PixelPanel>
      ) : (
        <>
          {stepper}
          <section className="lesson__stage" aria-label={STEP_LABEL[current]}>
            {current === 'ler' ? <LerStage primer={primer} /> : null}
            {current === 'praticar' ? (
              <PraticarPanel
                nodeId={nodeId}
                questionCount={questions.length}
                starOn={stars.quiz}
                best={best}
              />
            ) : null}
            {current === 'fixar' ? (
              <FixarPanel
                key={nodeId}
                nodeId={nodeId}
                cardCount={flashcards.length}
                dueCount={dueCount}
                newCount={newCount}
                best={best}
                onIntroduceDeck={introduceDeck}
              />
            ) : null}
            {current === 'construir' ? (
              <ConstruirPanel
                challenges={challenges}
                passed={passed}
                labs={getUnitLabs(save, node.unitId)}
              />
            ) : null}
            {next === null ? (
              <p className="lesson__done">Nó concluído</p>
            ) : coversNext ? null : (
              <ButtonLink
                className="lesson__continue"
                variant="quiet"
                to={`/no/${nodeId}?passo=${next}`}
              >
                Continuar
              </ButtonLink>
            )}
          </section>
          <section className="lesson__sect">
            <Domina
              items={flashcards.map((card) => ({
                id: card.id,
                front: card.front,
                state: getCardMastery(save, card.id),
              }))}
            />
          </section>
        </>
      )}
    </section>
  );
}
