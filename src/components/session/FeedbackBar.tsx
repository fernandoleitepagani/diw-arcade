import { forwardRef, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../pixel/Button/Button";
import { PixelIcon } from "../pixel/PixelIcon/PixelIcon";
import { PixelSprite } from "../pixel/PixelSprite/PixelSprite";
import "./FeedbackBar.css";

const PLAY_ROWS = ["X...", "XX..", "XXX.", "XXXX", "XXX.", "XX..", "X..."];
const PLAY_PALETTE = { X: "currentColor" };

export interface FeedbackBarProps {
  verdict: "correct" | "wrong";
  onContinue: () => void;
  continueLabel?: string;
  className?: string;
  /** Sprite shown left of the title; without it the title carries an icon. */
  mark?: ReactNode;
  children?: ReactNode;
}

/** Bottom bar announced politely after an answer; verdict is text plus mark. */
export const FeedbackBar = forwardRef<HTMLButtonElement, FeedbackBarProps>(
  function FeedbackBar(
    {
      verdict,
      onContinue,
      continueLabel = "Continuar",
      className,
      mark,
      children,
    },
    ref,
  ) {
    const correct = verdict === "correct";
    const barRef = useRef<HTMLDivElement>(null);

    // Publishes the bar height so the toast stack can sit above it.
    useEffect(() => {
      const bar = barRef.current;
      if (!bar) return;
      const root = document.documentElement;
      const publish = () =>
        root.style.setProperty(
          "--feedback-bar-h",
          `${bar.getBoundingClientRect().height}px`,
        );
      publish();
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(publish);
      observer?.observe(bar);
      return () => {
        observer?.disconnect();
        root.style.removeProperty("--feedback-bar-h");
      };
    }, []);

    return (
      <div
        ref={barRef}
        className={["feedback-bar", `feedback-bar--${verdict}`, className]
          .filter(Boolean)
          .join(" ")}
        role="status"
        aria-live="polite"
      >
        <div className="feedback-bar__inner">
          <div className="feedback-bar__content">
            {mark}
            <div className="feedback-bar__body">
              <h3 className="feedback-bar__verdict">
                {mark ? null : (
                  <PixelIcon name={correct ? "check" : "x"} scale={2} />
                )}
                <span>{correct ? "Correto." : "Quase."}</span>
              </h3>
              {children}
            </div>
          </div>
          <Button ref={ref} onClick={onContinue}>
            {continueLabel}
            <PixelSprite rows={PLAY_ROWS} palette={PLAY_PALETTE} scale={2} />
          </Button>
        </div>
      </div>
    );
  },
);
