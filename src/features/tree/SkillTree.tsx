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
} from '../../lib/progress/selectors';
import type { SaveV1 } from '../../lib/storage';
import { getNodeState, NODE_STATE_LABEL } from './nodeState';
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

/** Alternating lanes give the desktop list its winding shape. */
const LANES = ['center', 'right', 'center', 'left'] as const;

function dueLabel(count: number): string {
  return `${count} ${count === 1 ? 'carta para revisar' : 'cartas para revisar'}`;
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
          <header className="skill-tree__banner">
            <span className="skill-tree__banner-mark" aria-hidden="true">
              {unit.id.slice(1)}
            </span>
            <span className="skill-tree__banner-body">
              <span className="skill-tree__banner-kicker">
                Unidade {unit.id.slice(1)}
              </span>
              <h2 className="skill-tree__unit-title" id={`unit-${unit.id}`}>
                {unit.title}
              </h2>
            </span>
            <span className="skill-tree__banner-count">
              {unit.nodes.length} nós
            </span>
          </header>

          <ul className="skill-tree__nodes">
            {/* The line is decoration; the nodes themselves carry the meaning. */}
            <svg
              className="skill-tree__connector"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M50 0 C80 6 80 17 50 24 C20 31 20 44 50 51 C80 58 80 72 50 79 C20 86 20 94 50 100" />
            </svg>

            {unit.nodes.map((nodeId, index) => {
              const node = NODES.find((candidate) => candidate.id === nodeId);
              if (!node) return null;

              const recommended = node.id === recommendedId;
              const stars = getStars(save, node.id, TREE_CONTENT);
              const state = getNodeState(save, node.id, TREE_CONTENT);
              const due = dueByNode[node.id as NodeId] ?? 0;
              const lane = LANES[index % LANES.length];
              const classes = [
                'skill-node',
                `skill-node--${state}`,
                recommended ? 'skill-node--recommended' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={node.id}
                  className={`skill-tree__item skill-tree__item--${lane}`}
                >
                  <Link
                    className={classes}
                    to={`/no/${node.id}`}
                    data-node-id={node.id}
                  >
                    <span className="skill-node__orb" aria-hidden="true">
                      <span className="skill-node__index">
                        {node.id.slice(1)}
                      </span>
                    </span>
                    <span className="skill-node__body">
                      <span className="skill-node__title">{node.title}</span>
                      <span className="skill-node__status">
                        <span
                          className={`skill-node__state skill-node__state--${state}`}
                        >
                          {NODE_STATE_LABEL[state]}
                        </span>
                        {due > 0 ? (
                          <span className="skill-node__due">
                            {dueLabel(due)}
                          </span>
                        ) : null}
                        {recommended ? (
                          <span className="skill-node__tag">Recomendado</span>
                        ) : null}
                      </span>
                      <StarRating
                        modes={stars}
                        showLabels
                        size="lg"
                        className="skill-node__stars"
                      />
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
