import { forwardRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../pixel/Button/Button";
import { PixelIcon } from "../pixel/PixelIcon/PixelIcon";
import "./FeedbackBar.css";

export interface FeedbackBarProps {
  verdict: "correct" | "wrong";
  onContinue: () => void;
  continueLabel?: string;
  className?: string;
  children?: ReactNode;
}

/** Bottom bar announced politely after an answer; verdict is text plus icon. */
export const FeedbackBar = forwardRef<HTMLButtonElement, FeedbackBarProps>(
  function FeedbackBar(
    { verdict, onContinue, continueLabel = "Continuar", className, children },
    ref,
  ) {
    const correct = verdict === "correct";

    return (
      <div
        className={["feedback-bar", `feedback-bar--${verdict}`, className]
          .filter(Boolean)
          .join(" ")}
        role="status"
        aria-live="polite"
      >
        <div className="feedback-bar__body">
          <p className="feedback-bar__verdict">
            <PixelIcon name={correct ? "check" : "x"} scale={2} />
            <span>{correct ? "Correto!" : "Incorreto"}</span>
          </p>
          {children}
        </div>
        <Button ref={ref} onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    );
  },
);
