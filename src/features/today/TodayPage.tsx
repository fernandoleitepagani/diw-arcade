import { useProgress } from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { ButtonLink } from '../../components/pixel/Button/Button';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import { Row } from '../../components/pixel/Row/Row';
import { SegBar } from '../../components/pixel/SegBar/SegBar';
import { SPRITES } from '../../components/pixel/sprites';
import { Tag } from '../../components/pixel/Tag/Tag';
import {
  NODES,
  UNITS,
  getChallenges,
  getFlashcards,
  getQuestions,
} from '../../content';
import { hasPrimer } from '../../content/primers';
import { XP } from '../../lib/game/xp';
import type { ProgressContent } from '../../lib/progress/events';
import {
  LESSON_STEP_IDS,
  getLessonSteps,
  type LessonStepId,
} from '../../lib/progress/lessonSteps';
import { getNextStep } from '../../lib/progress/nextStep';
import {
  getDueCountByNode,
  getPrimersRead,
  getTodayXp,
} from '../../lib/progress/selectors';
import type { NodeId } from '../../content/tree';
import { UNIT_COLOR } from '../../styles/unitColors';
import './TodayPage.css';

/** Static content shaped for the progress selectors. */
const CONTENT: ProgressContent = {
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

const GOAL_SEGMENTS = 25;
const QUIZ_LENGTH = 10;
/** A 10-question quiz yields at least this much XP, so it covers a gap up to it. */
const QUIZ_MIN_XP = QUIZ_LENGTH * XP.quizCorrect;

const MISSING: Readonly<Record<LessonStepId, string>> = {
  ler: 'ler os pontos',
  praticar: 'o quiz',
  fixar: 'fixar as cartas',
  construir: 'o desafio',
};

export function TodayPage() {
  usePageTitle('Hoje');
  const { save, now } = useProgress();
  const { primary, alternates } = getNextStep(save, CONTENT, now);

  const nextAction = [primary, ...alternates].find(
    (action) => action.nodeId !== undefined,
  );
  const nodeId: NodeId | undefined = nextAction?.nodeId;
  const node = NODES.find((candidate) => candidate.id === nodeId);
  const unit = UNITS.find((candidate) => candidate.id === node?.unitId);

  const steps =
    nodeId === undefined
      ? undefined
      : getLessonSteps(save, nodeId, CONTENT, {
          hasPrimer: hasPrimer(nodeId),
          primersRead: getPrimersRead(save) as ReadonlySet<NodeId>,
        });
  const stepsDone = steps
    ? LESSON_STEP_IDS.filter((id) => steps[id] === 'feito').length
    : 0;
  const pending = steps
    ? LESSON_STEP_IDS.filter((id) => steps[id] === 'pendente')
    : [];
  const missing = pending[0];

  const dueTotal = Object.values(getDueCountByNode(save, CONTENT, now)).reduce(
    (total, count) => total + count,
    0,
  );

  const todayXp = getTodayXp(save, now);
  const dailyGoal = save.settings.dailyGoal;
  const goalMet = todayXp >= dailyGoal;
  const remaining = Math.max(0, dailyGoal - todayXp);
  const goalOn = Math.round(Math.min(1, todayXp / dailyGoal) * GOAL_SEGMENTS);
  const goalLabel = `${todayXp} de ${dailyGoal} XP hoje`;

  const unitColor = unit ? UNIT_COLOR[unit.id] : undefined;

  return (
    <div className="today">
      <h1 className="today__hello">Bom te ver de volta.</h1>

      <PixelPanel as="section" className="today__next" aria-labelledby="today-next">
        <div className="today__next-top">
          <div>
            <h2 id="today-next">
              {node?.title ?? 'Comece pela trilha'}
            </h2>
            <p className="today__muted today__next-sub">
              {node === undefined
                ? 'Escolha um nó na trilha para começar.'
                : missing === undefined
                  ? `Todos os passos feitos. ${stepsDone} de 4 passos.`
                  : `Falta ${MISSING[missing]}. ${stepsDone} de 4 passos.`}
            </p>
          </div>
          {unit !== undefined ? <Tag unit={unit.id}>{unit.title}</Tag> : null}
        </div>
        <span role="img" aria-label={`${stepsDone} de 4 passos`}>
          <SegBar on={stepsDone} total={4} color={unitColor} />
        </span>
        <ButtonLink to={nextAction?.href ?? '/trilha'}>Continuar</ButtonLink>
      </PixelPanel>

      {dueTotal > 0 || pending.includes('praticar') || pending.includes('ler') ? (
        <section className="today__sect" aria-labelledby="today-also">
          <h2 id="today-also">Também hoje</h2>
          <div>
            {dueTotal > 0 ? (
              <Row
                icon="cards"
                action={{ label: 'Revisar', to: '/revisao' }}
              >
                {dueTotal} {dueTotal === 1 ? 'carta' : 'cartas'} para revisar
              </Row>
            ) : null}
            {node !== undefined && pending.includes('praticar') ? (
              <Row
                icon="bolt"
                action={{
                  label: 'Começar',
                  to: `/no/${node.id}?passo=praticar`,
                }}
              >
                Quiz de {node.title}
              </Row>
            ) : null}
            {node !== undefined && pending.includes('ler') ? (
              <Row
                icon="book"
                action={{ label: 'Ler', to: `/no/${node.id}?passo=ler` }}
              >
                Primeiros pontos de {node.title}
              </Row>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="today__goal" data-testid="today-goal">
        <p className="today__goal-line">
          <PixelSprite {...SPRITES.coin} scale={2} />
          {goalLabel}
        </p>
        <SegBar
          on={goalOn}
          total={GOAL_SEGMENTS}
          color="var(--u-js)"
          label={goalLabel}
        />
        <p className="today__muted">
          {goalMet
            ? 'Meta de hoje cumprida. Qualquer prática extra é bônus.'
            : remaining <= QUIZ_MIN_XP
              ? `Faltam ${remaining} XP. Um quiz de ${QUIZ_LENGTH} perguntas já cobre.`
              : `Faltam ${remaining} XP.`}
        </p>
      </div>
    </div>
  );
}
