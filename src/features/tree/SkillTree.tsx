import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import {
  getChallenges,
  getFlashcards,
  getLab,
  getQuestions,
  NODE_BY_ID,
  NODES,
  UNITS,
} from '../../content';
import type { UnitId } from '../../content';
import { Tag } from '../../components/pixel/Tag/Tag';
import '../../components/pixel/PixelPanel/PixelPanel.css';
import type { ProgressContent } from '../../lib/progress/events';
import type { SaveV1 } from '../../lib/storage';
import { NODE_STATE_LABEL, type NodeState } from './nodeState';
import { NodeDisc, type DiscState } from './NodeDisc/NodeDisc';
import { buildTrail } from './trailModel';
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

const DISC_STATE: Record<NodeState, DiscState> = {
  nova: 'todo',
  'em-progresso': 'current',
  dominada: 'done',
};

/** Winding offsets, in the same 0 to 100 range as the prototype path. */
const OFFSETS = ['0', '28%', '48%', '28%'] as const;

function dueLabel(count: number): string {
  return `${count} ${count === 1 ? 'carta para revisar' : 'cartas para revisar'}`;
}

export function SkillTree({ save, now }: SkillTreeProps) {
  const trail = buildTrail(save, TREE_CONTENT, now);
  const [expanded, setExpanded] = useState<ReadonlySet<UnitId>>(new Set());

  const toggle = (unitId: UnitId) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(unitId)) next.add(unitId);
      return next;
    });

  return (
    <div className="skill-tree">
      {trail.map((entry) => {
        const unit = UNITS.find((candidate) => candidate.id === entry.unitId)!;
        const collapsible = entry.finished && !entry.current;
        const open = !collapsible || expanded.has(entry.unitId);
        const headingId = `unit-${unit.id}`;

        return (
          <section
            key={unit.id}
            id={headingId}
            className="skill-tree__unit"
            aria-labelledby={`${headingId}-title`}
          >
            <h2 className="skill-tree__unit-title" id={`${headingId}-title`}>
              {collapsible ? (
                <button
                  type="button"
                  className="px skill-tree__toggle"
                  aria-expanded={open}
                  aria-controls={`${headingId}-nodes`}
                  onClick={() => toggle(unit.id)}
                >
                  <NodeDisc unit={unit.id} state="done" number="" />
                  <span className="skill-tree__toggle-text">
                    <span className="skill-tree__unit-name">{unit.title}</span>
                    <span className="skill-tree__unit-count">
                      {entry.nodes.length} de {entry.nodes.length} nós, concluída
                    </span>
                  </span>
                </button>
              ) : (
                <Tag unit={unit.id}>{unit.title}</Tag>
              )}
            </h2>

            {open ? (
              <div id={`${headingId}-nodes`}>
                <ul className="skill-tree__nodes">
                  {/* The dotted line is decoration; the nodes carry the meaning. */}
                  <svg
                    className="skill-tree__path"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M10 0 C60 8 60 22 10 33 C-20 44 60 55 10 66 C-20 78 60 90 10 100" />
                  </svg>
                  {entry.nodes.map((item, index) => {
                    const node = NODE_BY_ID[item.id];
                    return (
                      <li
                        key={item.id}
                        className="skill-tree__item"
                        style={{ '--offset': OFFSETS[index % OFFSETS.length] } as CSSProperties}
                      >
                        <Link
                          className={`px skill-node skill-node--${item.state}`}
                          to={`/no/${item.id}`}
                          data-node-id={item.id}
                        >
                          <NodeDisc
                            unit={unit.id}
                            state={DISC_STATE[item.state]}
                            number={item.number}
                          />
                          <span className="skill-node__body">
                            <span className="skill-node__title">{node.title}</span>
                            <span className="skill-node__status">
                              <span className="skill-node__state">
                                {NODE_STATE_LABEL[item.state]}
                              </span>
                              {item.due > 0 ? (
                                <span className="skill-node__due">
                                  {dueLabel(item.due)}
                                </span>
                              ) : null}
                              {item.recommended ? (
                                <span className="skill-node__tag">Recomendado</span>
                              ) : null}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {entry.projects.length > 0 ? (
                  <div className="skill-tree__projects">
                    <h3 className="skill-tree__projects-title">Projetos</h3>
                    <ul className="skill-tree__project-list">
                      {entry.projects.map((labId) => (
                        <li key={labId}>
                          <Link
                            className="px skill-tree__project"
                            to={`/laboratorios/${labId}`}
                          >
                            {getLab(labId)?.title ?? labId}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
