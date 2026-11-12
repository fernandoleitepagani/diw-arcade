import {
  useProgress as readProgressContext,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { Mascot } from '../../components/ui';
import {
  NODES,
  NODE_IDS,
  getChallenges,
  getFlashcards,
  getQuestions,
} from '../../content';
import { pickLine } from '../../content/copy';
import {
  getCardRetention,
  getChallengeCompletion,
  getForecast,
  getNodeQuizAccuracy,
  getProgressTotals,
  type ProgressContent,
} from '../../lib/progress';
import { createEmptySave } from '../../lib/storage';
import { AchievementGrid } from './AchievementGrid';
import { Forecast } from './Forecast';
import { Heatmap, type HeatmapRow } from './Heatmap';
import './StatsPage.css';

export interface StatsPageProps {
  /** Test seam: override the content index used for the accuracy columns. */
  content?: ProgressContent;
}

const DEFAULT_CONTENT: ProgressContent = {
  questions: Object.fromEntries(
    NODE_IDS.map((nodeId) => [nodeId, getQuestions(nodeId)]),
  ) as ProgressContent['questions'],
  flashcards: Object.fromEntries(
    NODE_IDS.map((nodeId) => [nodeId, getFlashcards(nodeId)]),
  ) as ProgressContent['flashcards'],
  challenges: Object.fromEntries(
    NODE_IDS.map((nodeId) => [nodeId, getChallenges(nodeId)]),
  ) as ProgressContent['challenges'],
};

/**
 * The route smoke test renders pages without the progress provider. Reading
 * progress is optional here so the dashboard can mount in isolation; the app
 * always provides it through <App>.
 */
function useOptionalProgress(): ProgressContextValue | null {
  try {
    return readProgressContext();
  } catch {
    return null;
  }
}

function isFreshSave(
  save: ReturnType<typeof createEmptySave>,
  xpTotal: number,
): boolean {
  return (
    xpTotal === 0 &&
    Object.keys(save.days).length === 0 &&
    Object.keys(save.quiz.answers).length === 0 &&
    save.reviews.length === 0 &&
    Object.keys(save.challenges).length === 0 &&
    Object.keys(save.labs).length === 0
  );
}

function percent(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

export function StatsPage({ content = DEFAULT_CONTENT }: StatsPageProps = {}) {
  usePageTitle('Estatísticas');

  const progress = useOptionalProgress();
  const now = progress?.now ?? new Date();
  const save = progress?.save ?? createEmptySave(now);
  const totals = getProgressTotals(save, now);

  const accuracy = NODES.map((node) => ({
    nodeId: node.id,
    title: node.title,
    value: getNodeQuizAccuracy(save, node.id, content),
  }));

  const rows: HeatmapRow[] = accuracy.map((entry) => ({
    nodeId: entry.nodeId,
    title: entry.title,
    quiz: entry.value,
    cards: getCardRetention(save, entry.nodeId, content),
    challenges: getChallengeCompletion(save, entry.nodeId, content),
  }));

  const forecast = getForecast(save, now);
  const fresh = isFreshSave(save, totals.xpTotal);

  return (
    <section className="page stats-page">
      <h1>Estatísticas</h1>

      {fresh ? (
        <section className="stats__empty" aria-label="Sem atividade ainda">
          <Mascot mood="idle" line={pickLine('empty', totals.xpTotal)} />
          <p>Seu painel aparece aqui depois da primeira atividade.</p>
        </section>
      ) : null}

      <section className="stats__section" aria-labelledby="stats-totals">
        <h2 id="stats-totals">Seus números</h2>
        <dl className="stats__totals">
          <div className="stats__total">
            <dt>XP</dt>
            <dd>{totals.xpTotal}</dd>
          </div>
          <div className="stats__total">
            <dt>Nível</dt>
            <dd>{totals.level}</dd>
          </div>
          <div className="stats__total">
            <dt>Sequência atual</dt>
            <dd>{totals.streak}</dd>
          </div>
          <div className="stats__total">
            <dt>Maior sequência</dt>
            <dd>{totals.longestStreak}</dd>
          </div>
          <div className="stats__total">
            <dt>Revisões</dt>
            <dd>{totals.reviews}</dd>
          </div>
          <div className="stats__total">
            <dt>Desafios concluídos</dt>
            <dd>{totals.challengesPassed}</dd>
          </div>
          <div className="stats__total">
            <dt>Passos de laboratório</dt>
            <dd>{totals.labStepsDone}</dd>
          </div>
        </dl>
      </section>

      <section className="stats__section" aria-labelledby="stats-accuracy">
        <h2 id="stats-accuracy">Precisão por nó</h2>
        <ul className="stats__accuracy" aria-label="Precisão por nó">
          {accuracy.map((entry) => (
            <li key={entry.nodeId}>
              <span>{entry.title}</span>
              <span className="stats__accuracy-value">
                {percent(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stats__section" aria-labelledby="stats-heatmap">
        <h2 id="stats-heatmap">Mapa de pontos fracos</h2>
        <p className="stats__hint">
          Acertos no quiz, retenção das cartas e desafios concluídos por nó.
        </p>
        <div className="stats__scroll">
          <Heatmap rows={rows} />
        </div>
      </section>

      <section className="stats__section" aria-labelledby="stats-forecast">
        <h2 id="stats-forecast">Previsão de 14 dias</h2>
        <p className="stats__hint">Cartas que vencem em cada dia.</p>
        <div className="stats__scroll">
          <Forecast counts={forecast} now={now} />
        </div>
      </section>

      <section className="stats__section" aria-labelledby="stats-achievements">
        <h2 id="stats-achievements">Conquistas</h2>
        <AchievementGrid unlocked={save.achievements} />
      </section>
    </section>
  );
}
