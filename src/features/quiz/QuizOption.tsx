export interface QuizOptionProps {
  label: string;
  index: number;
  selected: boolean;
  locked: boolean;
  correct: boolean;
  onSelect: (index: number) => void;
}

const LETTERS = 'ABCD';

/** One radio alternative for mcq and tf, with its A to D shortcut key. */
export function QuizOption({
  label,
  index,
  selected,
  locked,
  correct,
  onSelect,
}: QuizOptionProps) {
  const picked = locked && selected;
  const classes = [
    'quiz-round__option',
    !locked && selected ? 'quiz-round__option--selected' : '',
    picked ? 'quiz-round__option--picked' : '',
    correct ? 'quiz-round__option--correct' : '',
    locked ? 'quiz-round__option--readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={classes}>
      <input
        type="radio"
        name="quiz-option"
        value={index}
        checked={selected}
        disabled={locked}
        onChange={() => onSelect(index)}
      />
      <span className="quiz-round__key" aria-hidden="true">
        {LETTERS[index]}
      </span>
      <span className="quiz-round__option-text">{label}</span>
      {locked ? (
        <span className="quiz-round__tags">
          {picked ? (
            <span className="quiz-round__tag quiz-round__tag--picked">
              Sua resposta
            </span>
          ) : null}
          {correct ? (
            <span className="quiz-round__tag quiz-round__tag--correct">
              Resposta correta
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
