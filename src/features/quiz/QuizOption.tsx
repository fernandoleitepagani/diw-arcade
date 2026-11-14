import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';

export interface QuizOptionProps {
  label: string;
  index: number;
  /** An answer was given: options stay focusable but stop answering. */
  locked: boolean;
  /** This option is the one the learner chose. */
  picked: boolean;
  /** This option is the right answer. */
  correct: boolean;
  onSelect: (index: number) => void;
}

const LETTERS = 'ABCD';

/** One answer button for mcq and tf; a click answers, A to D are shortcuts. */
export function QuizOption({
  label,
  index,
  locked,
  picked,
  correct,
  onSelect,
}: QuizOptionProps) {
  // Right: green. The picked wrong one: red. Everything else fades.
  const state = !locked ? '' : correct ? 'ok' : picked ? 'bad' : 'dim';
  const classes = ['quiz-round__option', state].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-disabled={locked ? true : undefined}
      onClick={() => {
        if (!locked) onSelect(index);
      }}
    >
      <span className="quiz-round__key" aria-hidden="true">
        {state === 'ok' ? (
          <PixelIcon name="check" scale={2} />
        ) : state === 'bad' ? (
          <PixelIcon name="x" scale={2} />
        ) : (
          LETTERS[index]
        )}
      </span>
      <span className="quiz-round__option-text">{label}</span>
      {picked ? <span className="sr-only">Sua resposta</span> : null}
      {correct ? <span className="sr-only">Resposta correta</span> : null}
    </button>
  );
}
