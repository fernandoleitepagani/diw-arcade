import { useEffect, useRef, useState } from 'react';
import type { CodeFiles, JsonValue } from '../../content/schema';
import { runInIframe } from './runner';
import './SandboxFrame.css';

export interface SandboxFrameProps {
  files: CodeFiles;
  libs?: readonly ('bootstrap')[];
  mocks?: Record<string, JsonValue>;
  title?: string;
}

const DEBOUNCE_MS = 500;

/** Debounced live preview of the code plus the harness error list. */
export function SandboxFrame({
  files,
  libs,
  mocks,
  title = 'Prévia do desafio',
}: SandboxFrameProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const { html, css, js } = files;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      viewport.replaceChildren();
      setErrors([]);
      const { iframe, result } = runInIframe(viewport, { html, css, js }, {
        mode: 'preview',
        libs,
        mocks,
      });
      iframe.title = title;

      void result.then((value) => {
        if (cancelled) {
          return;
        }
        setErrors(value.errors);
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      viewport.replaceChildren();
    };
  }, [html, css, js, libs, mocks, title]);

  return (
    <section className="sandbox-frame" aria-label={title}>
      <div className="sandbox-frame__viewport" ref={viewportRef} />
      <div className="sandbox-frame__report" aria-live="polite">
        <p className="sandbox-frame__report-title">Erros</p>
        {errors.length === 0 ? (
          <p className="sandbox-frame__ok">Sem erros</p>
        ) : (
          <ul className="sandbox-frame__list">
            {errors.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
