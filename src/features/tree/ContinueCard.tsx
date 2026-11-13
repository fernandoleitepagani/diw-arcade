import { Link } from 'react-router';
import { Bit } from '../../components/pixel/Bit/Bit';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { SegBar } from '../../components/pixel/SegBar/SegBar';
import {
  NODES,
  UNITS,
  getChallenges,
  getFlashcards,
  getQuestions,
} from '../../content';
import { pickLine } from '../../content/copy';
import type { ProgressContent } from '../../lib/progress/events';
import { getRecommendedNodeId } from '../../lib/progress/recommend';
import {
  getDueCountByNode,
  getStreak,
  getTodayXp,
} from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';
import './ContinueCard.css';

/** Static content shaped for the progress selectors. */
const TREE_CONTENT: ProgressContent = {
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

export interface ContinueCardProps {
  save: SaveV1;
  now: Date;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Home hero: the single next action, framed by the numbers that decide it.
 */
export function ContinueCard({ save, now }: ContinueCardProps) {
  const recommendedId = getRecommendedNodeId(save, TREE_CONTENT, now);
  const node = NODES.find((candidate) => candidate.id === recommendedId);
  if (!node) return null;

  const unit = UNITS.find((candidate) => candidate.id === node.unitId);
  const dueByNode = getDueCountByNode(save, TREE_CONTENT, now);
  const dueTotal = Object.values(dueByNode).reduce(
    (total, count) => total + count,
    0,
  );
  const recommendedDue = dueByNode[recommendedId] ?? 0;
  const todayXp = getTodayXp(save, now);
  const goal = save.settings.dailyGoal;
  const goalMet = todayXp >= goal;
  const streak = getStreak(save, now);

  return (
    <PixelPanel
      as="section"
      aria-label="Continuar"
      className="continue-card"
    >
      <span className="continue-card__index" aria-hidden="true">
        {node.id.slice(1)}
      </span>

      <div className="continue-card__intro">
        <p className="continue-card__kicker">Sua próxima parada</p>
        <h2 className="continue-card__node">{node.title}</h2>
        {unit ? <p className="continue-card__unit">{unit.title}</p> : null}
        <p className="continue-card__reason">
          {recommendedDue > 0
            ? `${plural(recommendedDue, 'carta devida', 'cartas devidas')} neste nó.`
            : 'Seu próximo passo na trilha.'}
        </p>
        <div className="continue-card__actions">
          <Link
            className="ui-button ui-button--primary ui-button--lg"
            to={`/no/${node.id}`}
          >
            Continuar
          </Link>
          {dueTotal > 0 ? (
            <Link className="ui-button ui-button--secondary" to="/revisao">
              {`Revisar ${plural(dueTotal, 'carta', 'cartas')}`}
            </Link>
          ) : null}
        </div>
      </div>

      <dl className="continue-card__stats">
        <div className="continue-card__stat">
          <dt>Meta diária</dt>
          <dd>
            <span className="continue-card__goal">
              <SegBar
                label="Meta diária"
                on={Math.min(10, Math.round((todayXp / goal) * 10))}
                total={10}
                color={goalMet ? 'var(--ok)' : undefined}
              />
              <span className="continue-card__goal-value">
                {todayXp}/{goal} XP hoje
              </span>
            </span>
          </dd>
        </div>

        <div className="continue-card__stat">
          <dt>Sequência</dt>
          <dd>
            <span className="continue-card__stat-value">{streak}</span>
            <span className="continue-card__stat-note">
              {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </span>
          </dd>
        </div>

        <div className="continue-card__stat">
          <dt>Cartas devidas</dt>
          <dd>
            <span className="continue-card__stat-value">{dueTotal}</span>
            <span className="continue-card__stat-note">
              {dueTotal === 1 ? 'carta para revisar' : 'cartas para revisar'}
            </span>
          </dd>
        </div>
      </dl>

      <div className="continue-card__bit">
        <Bit scale={7} />
        <p className="continue-card__bit-line">{pickLine('welcome', 3)}</p>
      </div>
    </PixelPanel>
  );
}
