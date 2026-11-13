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

export function PrimerView({ primer }: { primer: Primer }) {
  return (
    <ol className="primer">
      {primer.points.map((point, index) => (
        <li className="primer__point" key={index}>
          <h3 className="primer__title">{point.title}</h3>
          <p className="primer__body">{renderBody(point.body)}</p>
          {point.code ? (
            <figure className="primer__code">
              {point.code.caption ? (
                <figcaption>{point.code.caption}</figcaption>
              ) : null}
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be keyboard reachable */}
              <pre tabIndex={0}>
                <code>{point.code.text}</code>
              </pre>
            </figure>
          ) : null}
          <p className="primer__source">{formatSource(point.source)}</p>
        </li>
      ))}
    </ol>
  );
}
