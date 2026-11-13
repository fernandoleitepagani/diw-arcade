import './PixelSprite.css';

export interface PixelSpriteProps {
  rows: readonly string[];
  palette: Readonly<Record<string, string>>;
  scale: number;
  label?: string;
}

export function PixelSprite({ rows, palette, scale, label }: PixelSpriteProps) {
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const cells = rows.flatMap((row, y) =>
    [...row].flatMap((cell, x) => {
      const fill = palette[cell];
      return fill
        ? [
            <rect
              key={`${x},${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
            />,
          ]
        : [];
    }),
  );
  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true };

  return (
    <svg
      className="px-i"
      shapeRendering="crispEdges"
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      {...a11y}
    >
      {cells}
    </svg>
  );
}
