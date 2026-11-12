import { Link } from 'react-router';
import {
  getChallenges,
  getFlashcards,
  getQuestions,
  NODES,
  UNITS,
  type NodeId,
} from '../../content';
import { StarRating } from '../../components/ui';
import type { ProgressContent } from '../../lib/progress/events';
import { getRecommendedNodeId } from '../../lib/progress/recommend';
import {
  getDueCountByNode,
  getStars,
  getStarCount,
} from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';
import './SkillTree.css';

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

export interface SkillTreeProps {
  save: SaveV1;
  now: Date;
}

function dueLabel(count: number): string {
  if (count === 0) return 'Em dia';
  return `${count} ${count === 1 ? 'devida' : 'devidas'}`;
}

export function SkillTree({ save, now }: SkillTreeProps) {
  const recommendedId = getRecommendedNodeId(save, TREE_CONTENT, now);
  const dueByNode = getDueCountByNode(save, TREE_CONTENT, now);

  return (
    <div className="skill-tree">
      {UNITS.map((unit) => (
        <section
          key={unit.id}
          className="skill-tree__unit"
          aria-labelledby={`unit-${unit.id}`}
        >
          <h2 className="skill-tree__unit-title" id={`unit-${unit.id}`}>
            {unit.title}
          </h2>

          <ul className="skill-tree__nodes">
            {/* The line is decoration; the cards themselves carry the meaning. */}
            <svg
              className="skill-tree__connector"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M50 0 V100" />
            </svg>

            {unit.nodes.map((nodeId) => {
              const node = NODES.find((candidate) => candidate.id === nodeId);
              if (!node) return null;

              const recommended = node.id === recommendedId;
              const stars = getStarCount(getStars(save, node.id, TREE_CONTENT));
              const due = dueByNode[node.id as NodeId] ?? 0;

              return (
                <li key={node.id} className="skill-tree__item">
                  <Link
                    className={
                      recommended
                        ? 'skill-node skill-node--recommended'
                        : 'skill-node'
                    }
                    to={`/no/${node.id}`}
                    data-node-id={node.id}
                  >
                    <span className="skill-node__index" aria-hidden="true">
                      {node.id.slice(1)}
                    </span>
                    <span className="skill-node__body">
                      <span className="skill-node__title">{node.title}</span>
                      <span className="skill-node__meta">
                        <StarRating stars={stars} size="sm" />
                        <span
                          className={
                            due > 0
                              ? 'skill-node__due skill-node__due--hot'
                              : 'skill-node__due'
                          }
                        >
                          {dueLabel(due)}
                        </span>
                      </span>
                      {recommended ? (
                        <span className="skill-node__tag">Recomendado</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
