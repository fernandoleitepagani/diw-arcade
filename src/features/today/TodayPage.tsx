import { Link } from 'react-router';
import { useProgress } from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { ButtonLink } from '../../components/pixel/Button/Button';
import { Tag } from '../../components/pixel/Tag/Tag';
import {
  NODES,
  UNITS,
  getChallenges,
  getFlashcards,
  getQuestions,
} from '../../content';
import type { ProgressContent } from '../../lib/progress/events';
import { getNextStep } from '../../lib/progress/nextStep';
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

export function TodayPage() {
  usePageTitle('Hoje');
  const { save, now } = useProgress();
  const { primary, alternates, goal } = getNextStep(save, CONTENT, now);
  const unit = UNITS.find((candidate) => candidate.id === primary.unitId);

  return (
    <section className="page today">
      <h1>Hoje</h1>
      <p className="today__goal" data-testid="today-goal">
        {goal}
      </p>

      <div className="today__primary">
        {unit !== undefined && primary.unitId !== undefined ? (
          <Tag unit={primary.unitId}>{unit.title}</Tag>
        ) : null}
        {primary.detail !== undefined ? (
          <p className="today__node">{primary.detail}</p>
        ) : null}
        <ButtonLink to={primary.href}>{primary.label}</ButtonLink>
      </div>

      {alternates.length > 0 ? (
        <section aria-labelledby="today-alternates" className="today__alternates">
          <h2 id="today-alternates">Outras opções</h2>
          <ul>
            {alternates.map((action) => (
              <li key={action.href}>
                <Link className="today__alt" to={action.href}>
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
