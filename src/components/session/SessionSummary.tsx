import { useId } from "react";
import type { ReactNode } from "react";
import type { Stars } from "../../lib/progress/selectors";
import { ButtonLink } from "../pixel/Button/Button";
import { SegBar } from "../pixel/SegBar/SegBar";
import { PixelSprite } from "../pixel/PixelSprite/PixelSprite";
import { SPRITES } from "../pixel/sprites";
import type { NextAction } from "../../lib/progress/nextStep";
import "./SessionSummary.css";

const MODES = [
  { key: "quiz", label: "quiz" },
  { key: "cards", label: "cartas" },
  { key: "code", label: "código" },
] as const;

const NO_STARS: Stars = { quiz: false, cards: false, code: false };

export interface SessionStat {
  label: string;
  value: ReactNode;
}

export interface SessionFact {
  label: string;
  value: ReactNode;
  /** Pixel sprite drawn before the value. */
  sprite?: "coin" | "flame";
}

export interface SessionScore {
  right: number;
  total: number;
}

export interface SessionLevel {
  /** XP still missing for the next level. */
  missing: number;
  next: number;
  on: number;
  total: number;
}

export interface SessionSummaryProps {
  title: string;
  xp: number;
  stats: SessionStat[];
  starsBefore?: Stars;
  starsAfter?: Stars;
  next: Pick<NextAction, "label" | "href">;
  secondary?: ReactNode;
  /** One-line remark from the Bit, shown beside the sprite. */
  bitLine?: string;
  /** Headline "Você acertou n de m"; the title becomes screen-reader only. */
  score?: SessionScore;
  /** Replaces the plain "+N XP" line with a row of facts. */
  facts?: SessionFact[];
  level?: SessionLevel;
  prose?: ReactNode;
}

function starsLabel(before: Stars, after: Stars): string {
  const earned = MODES.filter(
    (mode) => after[mode.key] && !before[mode.key],
  ).map((mode) => mode.label);

  return earned.length === 0
    ? "Nenhuma estrela nova nesta rodada"
    : `Estrelas conquistadas: ${earned.join(", ")}`;
}

export function SessionSummary({
  title,
  xp,
  stats,
  starsBefore,
  starsAfter,
  next,
  secondary,
  bitLine,
  score,
  facts,
  level,
  prose,
}: SessionSummaryProps) {
  const titleId = useId();
  const before = starsBefore ?? NO_STARS;

  return (
    <section
      className={["session-summary", score ? "session-summary--score" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={titleId}
    >
      <div className="session-summary__bit">
        <PixelSprite
          rows={SPRITES.bit.rows}
          palette={SPRITES.bit.palette}
          scale={score ? 3 : 6}
        />
        {bitLine ? <p className="session-summary__bit-line">{bitLine}</p> : null}
      </div>
      <h2
        id={titleId}
        className={
          score ? "session-summary__title sr-only" : "session-summary__title"
        }
      >
        {title}
      </h2>

      {score ? (
        <div className="session-summary__score">
          <p className="session-summary__lead">Você acertou</p>
          <p className="session-summary__big">{`${score.right} de ${score.total}`}</p>
        </div>
      ) : null}

      {facts ? (
        <dl className="session-summary__facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.sprite ? (
                  <PixelSprite
                    rows={SPRITES[fact.sprite].rows}
                    palette={SPRITES[fact.sprite].palette}
                    scale={3}
                  />
                ) : null}
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="session-summary__xp">{`+${xp} XP`}</p>
      )}

      {stats.length > 0 ? (
        <dl className="session-summary__stats">
          {stats.map((stat, index) => (
            <div
              key={`${stat.label}-${index}`}
              className="session-summary__stat"
            >
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {level ? (
        <div className="session-summary__level">
          <p>{`Faltam ${level.missing} XP para o nível ${level.next}`}</p>
          <SegBar on={level.on} total={level.total} color="var(--u-js)" />
        </div>
      ) : null}

      {prose ? <p className="session-summary__prose">{prose}</p> : null}

      {starsAfter ? (
        <div className="session-summary__stars-block">
          <h3 className="session-summary__stars-title">
            Estrelas conquistadas
          </h3>
          <div
            className="session-summary__stars"
            role="img"
            aria-label={starsLabel(before, starsAfter)}
          >
            {MODES.map((mode) => {
              const on = starsAfter[mode.key];
              const isNew = on && !before[mode.key];
              const classes = [
                "session-summary__star",
                on ? "session-summary__star--on" : "",
                isNew ? "session-summary__star--new" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <span key={mode.key} className={classes} aria-hidden="true">
                  {on ? "★" : "☆"}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="session-summary__actions">
        <ButtonLink className="session-summary__next" to={next.href}>
          {next.label}
        </ButtonLink>
        {secondary}
      </div>
    </section>
  );
}
