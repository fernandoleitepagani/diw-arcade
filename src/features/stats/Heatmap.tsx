export interface HeatmapRow {
  nodeId: string;
  title: string;
  quiz: number | null;
  cards: number | null;
  challenges: number | null;
}

export interface HeatmapProps {
  rows: readonly HeatmapRow[];
}

type Level = 0 | 1 | 2 | 3 | 4;

/** Five bands, from weak (0) to strong (4). */
function levelFor(value: number | null): Level | null {
  if (value === null) return null;
  if (value >= 80) return 4;
  if (value >= 60) return 3;
  if (value >= 40) return 2;
  if (value >= 20) return 1;
  return 0;
}

function Cell({ value }: { value: number | null }) {
  const level = levelFor(value);

  return (
    <td
      className="heatmap__cell"
      data-level={level === null ? 'empty' : level}
    >
      <span className="heatmap__value">
        {value === null ? '—' : `${Math.round(value)}%`}
      </span>
    </td>
  );
}

export function Heatmap({ rows }: HeatmapProps) {
  return (
    <table className="heatmap">
      <caption>Mapa de pontos fracos</caption>
      <thead>
        <tr>
          <th scope="col">Nó</th>
          <th scope="col">Quiz</th>
          <th scope="col">Cartas</th>
          <th scope="col">Código</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.nodeId}>
            <th scope="row">{row.title}</th>
            <Cell value={row.quiz} />
            <Cell value={row.cards} />
            <Cell value={row.challenges} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}
