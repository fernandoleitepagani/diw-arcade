import { usePageTitle } from '../../app/usePageTitle';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { UNITS } from '../../content';
import { createEmptySave } from '../../lib/storage';
import { ContinueCard } from './ContinueCard';
import { SkillTree } from './SkillTree';
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

  return (
    <section className="page tree-page">
      <h1 className="sr-only">DIW Arcade</h1>

      <ContinueCard save={save} now={now} />

      <div className="tree-page__layout">
        <section className="tree-page__trail" aria-label="Trilha">
          <SkillTree save={save} now={now} />
        </section>

        <aside className="tree-page__units" aria-labelledby="tree-units-title">
          <h2 className="tree-page__units-title" id="tree-units-title">
            Unidades
          </h2>
          <ol className="tree-page__unit-list">
            {UNITS.map((unit) => (
              <li key={unit.id}>
                <a href={`#unit-${unit.id}`}>
                  <span>{unit.title}</span>
                  <span className="tree-page__unit-count">
                    {unit.nodes.length}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
