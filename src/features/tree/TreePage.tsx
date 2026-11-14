import { usePageTitle } from '../../app/usePageTitle';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { NODE_BY_ID } from '../../content';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import { SPRITES } from '../../components/pixel/sprites';
import { createEmptySave } from '../../lib/storage';
import { Link } from 'react-router';
import { SkillTree, TREE_CONTENT } from './SkillTree';
import { buildTrail } from './trailModel';
import './TreePage.css';

const ISOLATED_SAVE = createEmptySave(new Date(0));
const ISOLATED_NOW = new Date(0);

/**
 * Route-level rendering (and the route smoke tests) can mount the page without
 * the progress provider. The provider is the normal path; the empty save keeps
 * the tree renderable for an isolated route.
 */
function useOptionalProgress(): ProgressContextValue | null {
  try {
    return useProgress();
  } catch {
    return null;
  }
}

export function TreePage() {
  usePageTitle('Árvore');
  const progress = useOptionalProgress();
  const save = progress?.save ?? ISOLATED_SAVE;
  const now = progress?.now ?? ISOLATED_NOW;

  const nodes = buildTrail(save, TREE_CONTENT, now).flatMap((unit) => unit.nodes);
  const done = nodes.filter((node) => node.state === 'dominada').length;
  const here = done < nodes.length ? nodes.find((node) => node.recommended) : undefined;
  const title = here ? NODE_BY_ID[here.id].title : null;

  return (
    <section className="page tree-page">
      <div className="tree-page__head">
        <div>
          <h1>Trilha</h1>
          <p className="tree-page__summary">
            {done} de {nodes.length} nós concluídos.
            {title ? ` Você está em ${title}.` : ''}
          </p>
        </div>
        {here && title ? (
          <Link className="btn primary" to={`/no/${here.id}`}>
            Continuar {title}
            <PixelSprite {...SPRITES.play} scale={2} />
          </Link>
        ) : null}
      </div>

      <section className="tree-page__trail" aria-label="Trilha">
        <SkillTree save={save} now={now} />
      </section>
    </section>
  );
}
