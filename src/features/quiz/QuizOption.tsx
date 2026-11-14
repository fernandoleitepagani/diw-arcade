import type { ReactNode } from 'react';
import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';

/**
 * Content writes inline code with backticks; show it as <code>. Used for the
 * explanation only: the screenshot harness matches prompts and option labels
 * by their literal text.
 */
export function inlineCode(text: string): ReactNode {
  const parts = text.split(/`([^`\n]+)`/);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? <code key={index}>{part}</code> : part,
  );
}

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
