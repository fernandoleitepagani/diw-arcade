import {
  useProgress as readProgressContext,
  type ProgressContextValue,
} from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { Card, Mascot, PageHeader } from '../../components/ui';
import {
  NODES,
  NODE_IDS,
  getChallenges,
  getFlashcards,
  getQuestions,
} from '../../content';
import { pickLine } from '../../content/copy';
import { ACHIEVEMENTS } from '../../lib/game/achievements';
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

function AccuracyBar({
  title,
  value,
}: {
  title: string;
  value: number | null;
}) {
  const rounded = value === null ? 0 : Math.round(value);
  const valueText = value === null ? 'Sem dados' : `${rounded}%`;

  return (
    <span
      aria-label={title}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={rounded}
      aria-valuetext={valueText}
      className="stats__accuracy-meter"
      role="meter"
    >
      <span
        className="stats__accuracy-fill"
        data-empty={value === null ? 'true' : 'false'}
        style={{ width: `${rounded}%` }}
      />
    </span>
  );
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
  const forecastTotal = forecast.reduce((sum, count) => sum + count, 0);
  const forecastWeek = forecast
    .slice(0, 7)
    .reduce((sum, count) => sum + count, 0);
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) =>
    Boolean(save.achievements[achievement.id]),
  ).length;
  const fresh = isFreshSave(save, totals.xpTotal);

  const tiles = [
    { label: 'XP', value: totals.xpTotal, tone: 'xp' },
    { label: 'Nível', value: totals.level, tone: 'level' },
    { label: 'Sequência atual', value: totals.streak, tone: 'streak' },
    { label: 'Maior sequência', value: totals.longestStreak, tone: 'streak' },
    { label: 'Revisões', value: totals.reviews, tone: 'review' },
    {
      label: 'Desafios concluídos',
      value: totals.challengesPassed,
      tone: 'code',
    },
    {
      label: 'Passos de laboratório',
      value: totals.labStepsDone,
      tone: 'lab',
    },
  ];

  return (
    <section className="page stats-page">
      <PageHeader
        className="stats__header"
        description="Seu avanço no DIW Arcade, nó a nó: precisão, retenção e a previsão das próximas revisões."
        eyebrow="Painel de progresso"
        title="Progresso"
      />

      {fresh ? (
        <Card
          as="section"
          aria-label="Sem atividade ainda"
          className="stats__empty"
        >
          <Mascot mood="idle" line={pickLine('empty', totals.xpTotal)} />
          <p>Seu painel aparece aqui depois da primeira atividade.</p>
        </Card>
      ) : null}

      <section className="stats__section" aria-labelledby="stats-totals">
        <div className="stats__section-head">
          <h2 id="stats-totals">Seus números</h2>
          <p className="stats__hint">Acumulado desde o início.</p>
        </div>
        <dl className="stats__totals l-grid">
          {tiles.map((tile) => (
            <div className="stats__total" data-tone={tile.tone} key={tile.label}>
              <dt>{tile.label}</dt>
              <dd>{tile.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="stats__columns">
        <section
          className="stats__panel"
          aria-labelledby="stats-accuracy"
        >
          <div className="stats__section-head">
            <h2 id="stats-accuracy">Precisão por nó</h2>
            <p className="stats__hint">Acertos de primeira no quiz.</p>
          </div>
          <ul className="stats__accuracy" aria-label="Precisão por nó">
            {accuracy.map((entry) => (
              <li className="stats__accuracy-row" key={entry.nodeId}>
                <span className="stats__accuracy-title">{entry.title}</span>
                <span className="stats__accuracy-value">
                  {percent(entry.value)}
                </span>
                <AccuracyBar title={entry.title} value={entry.value} />
              </li>
            ))}
          </ul>
        </section>

        <section
          className="stats__panel stats__forecast"
          aria-labelledby="stats-forecast"
        >
          <div className="stats__section-head">
            <h2 id="stats-forecast">Previsão de 14 dias</h2>
            <p className="stats__hint">Cartas que vencem em cada dia.</p>
          </div>
          <div className="stats__scroll">
            <Forecast counts={forecast} now={now} />
          </div>
          <dl className="stats__forecast-summary">
            <div>
              <dt>Hoje</dt>
              <dd>{forecast[0] ?? 0}</dd>
            </div>
            <div>
              <dt>Próximos 7 dias</dt>
              <dd>{forecastWeek}</dd>
            </div>
            <div>
              <dt>Em 14 dias</dt>
              <dd>{forecastTotal}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="stats__panel" aria-labelledby="stats-heatmap">
        <div className="stats__section-head">
          <h2 id="stats-heatmap">Mapa de pontos fracos</h2>
          <p className="stats__hint">
            Acertos no quiz, retenção das cartas e desafios concluídos por nó.
          </p>
        </div>
        <div className="stats__scroll">
          <Heatmap rows={rows} />
        </div>
      </section>

      <section className="stats__panel" aria-labelledby="stats-achievements">
        <div className="stats__section-head">
          <h2 id="stats-achievements">Conquistas</h2>
          <p className="stats__hint">
            {unlockedAchievements} de {ACHIEVEMENTS.length} desbloqueadas.
          </p>
        </div>
        <AchievementGrid unlocked={save.achievements} />
      </section>
    </section>
  );
}
