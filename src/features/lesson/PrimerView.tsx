import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import type { Primer } from '../../content';
import { formatSource } from '../../content/source';

function renderBody(body: string) {
  return body
    .split(/(`[^`]+`)/)
    .map((part, index) =>
      part.length > 1 && part.startsWith('`') && part.endsWith('`') ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}

const WORDS_PER_MINUTE = 150;

/** Reading time from the real words of the primer, never below one minute. */
export function readMinutes(primer: Primer): number {
  const words = primer.points
    .map((point) => `${point.title} ${point.body} ${point.code?.text ?? ''}`)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function PrimerView({ primer }: { primer: Primer }) {
  return (
    <ol className="primer">
      {primer.points.map((point, index) => (
        <li className="primer__point" key={index}>
          <div>
            <h3 className="primer__title">{point.title}</h3>
            <p className="primer__body">{renderBody(point.body)}</p>
            {point.code ? (
              <figure className="primer__code">
                {point.code.caption ? (
                  <figcaption>{point.code.caption}</figcaption>
                ) : null}
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable */}
                <pre tabIndex={0}>
                  <code>
                    {point.code.text.split('\n').map((line, lineIndex, all) => (
                      <span className="primer__line" key={lineIndex}>
                        {line}
                        {lineIndex < all.length - 1 ? '\n' : ''}
                      </span>
                    ))}
                  </code>
                </pre>
              </figure>
            ) : null}
            <p className="primer__source">
              <PixelIcon name="book" />
              {formatSource(point.source)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
