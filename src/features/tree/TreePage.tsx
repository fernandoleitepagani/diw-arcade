import { usePageTitle } from '../../app/usePageTitle';
import {
  useProgress,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { Mascot } from '../../components/ui';
import { pickLine } from '../../content/copy';
import { createEmptySave } from '../../lib/storage';
import { SkillTree } from './SkillTree';

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
      <header className="tree-page__header">
        <h1>DIW Arcade</h1>
        <p>
          Sua trilha de Desenvolvimento de Interfaces Web. Todos os nós estão
          abertos: escolha por onde continuar.
        </p>
      </header>

      <aside className="tree-page__bit" aria-label="Dica do Bit">
        <Mascot mood="idle" line={pickLine('welcome', 3)} size={88} />
      </aside>

      <SkillTree save={save} now={now} />
    </section>
  );
}
