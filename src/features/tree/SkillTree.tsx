import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import {
  getChallenges,
  getFlashcards,
  getQuestions,
  NODE_BY_ID,
  NODES,
  UNITS,
} from '../../content';
import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import type { ProgressContent } from '../../lib/progress/events';
import type { SaveV1 } from '../../lib/storage';
import { UNIT_COLOR } from '../../styles/unitColors';
import { NODE_STATE_LABEL, type NodeState } from './nodeState';
import { NodeDisc, type DiscState } from './NodeDisc/NodeDisc';
import { buildTrail, getStepsDone, layoutTrail } from './trailModel';
import './SkillTree.css';

/** Static content shaped for the progress selectors. */
export const TREE_CONTENT: ProgressContent = {
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

/** The marker of the last node of the trail: the Prova 2 boss. */
const BOSS_ROWS = [
  'XXXXXXXX',
  'XXXXXXXX',
  '.XXXXXX.',
  '..XXXX..',
  '...XX...',
  '...XX...',
  '..XXXX..',
  '.XXXXXX.',
];

export interface SkillTreeProps {
  save: SaveV1;
  now: Date;
}

const DISC_STATE: Record<NodeState, DiscState> = {
  nova: 'todo',
  'em-progresso': 'current',
  dominada: 'done',
};

export function SkillTree({ save, now }: SkillTreeProps) {
  const trail = buildTrail(save, TREE_CONTENT, now);
  const layout = layoutTrail(trail);
  const allDone = trail.every((entry) => entry.finished);
  const lastNodeId = NODES[NODES.length - 1]!.id;

  return (
    <div className="skill-tree" style={{ height: layout.height }}>
      {/* The dotted line is decoration; the nodes carry the meaning. */}
      <svg
        className="skill-tree__path"
        viewBox={`0 0 100 ${layout.height}`}
        height={layout.height}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d={layout.path} />
      </svg>
      {trail.map((entry) => {
        const unit = UNITS.find((candidate) => candidate.id === entry.unitId)!;
        const done = entry.nodes.filter((n) => n.state === 'dominada').length;
        const color = UNIT_COLOR[unit.id];
        return [
          <h2
            key={unit.id}
            id={`unit-${unit.id}`}
            className="skill-tree__unit"
            style={{ top: layout.unitTop[unit.id], '--c': color } as CSSProperties}
          >
            <i className="skill-tree__dot" aria-hidden="true" />
            {unit.title}
            <small>
              {done} de {entry.nodes.length}
            </small>
          </h2>,
          ...entry.nodes.map((item) => {
            const node = NODE_BY_ID[item.id];
            const place = layout.node[item.id]!;
            const here = item.recommended && !allDone;
            const disc = here && item.state === 'nova' ? 'current' : DISC_STATE[item.state];
            return (
              <Link
                key={item.id}
                className={`skill-node skill-node--${item.state}`}
                to={`/no/${item.id}`}
                data-node-id={item.id}
                aria-label={`${node.title}, ${NODE_STATE_LABEL[item.state]}`}
                style={
                  { top: place.top, '--c': color, '--f': place.f } as CSSProperties
                }
              >
                <NodeDisc state={disc} />
                <span className="skill-node__lbl">
                  <span className="skill-node__n">{item.number}</span>
                  {node.title}
                  {here ? (
                    <span className="skill-node__sub">
                      <PixelIcon name="cursor" />
                      Você está aqui, {getStepsDone(save, item.id, TREE_CONTENT)} de 4 passos
                    </span>
                  ) : null}
                  {item.id === lastNodeId ? (
                    <span className="skill-node__boss" aria-hidden="true">
                      <PixelSprite
                        rows={BOSS_ROWS}
                        palette={{ X: 'var(--u-js)' }}
                        scale={2}
                      />
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          }),
        ];
      })}
    </div>
  );
}
