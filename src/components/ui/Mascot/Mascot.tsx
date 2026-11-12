import './Mascot.css';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'thinking';

export interface MascotProps {
  mood: MascotMood;
  line?: string;
  size?: number;
}

function Face({ mood }: { mood: MascotMood }) {
  const fill = 'var(--accent)';

  switch (mood) {
    case 'happy':
      return (
        <>
          <rect x="5" y="5" width="2" height="1" fill={fill} />
          <rect x="9" y="5" width="2" height="1" fill={fill} />
          <rect x="6" y="7" width="4" height="1" fill={fill} />
        </>
      );
    case 'sad':
      return (
        <>
          <rect x="5" y="6" width="2" height="1" fill={fill} />
          <rect x="9" y="6" width="2" height="1" fill={fill} />
          <rect x="7" y="7" width="2" height="1" fill={fill} />
        </>
      );
    case 'thinking':
      return (
        <>
          <rect x="5" y="5" width="2" height="2" fill={fill} />
          <rect x="10" y="6" width="1" height="1" fill={fill} />
          <rect x="7" y="7" width="1" height="1" fill={fill} />
        </>
      );
    default:
      return (
        <>
          <rect x="5" y="5" width="2" height="2" fill={fill} />
          <rect x="9" y="5" width="2" height="2" fill={fill} />
        </>
      );
  }
}

export function Mascot({ mood, line, size = 96 }: MascotProps) {
  return (
    <div className={`mascot mascot--${mood}`} data-mood={mood}>
      {line ? <p className="mascot__bubble">{line}</p> : null}
      <svg
        className="mascot__art"
        width={size}
        height={size}
        viewBox="0 0 16 16"
        role="img"
        aria-label="Bit, o robô mascote"
        shapeRendering="crispEdges"
        focusable="false"
      >
        <rect
          className="mascot__antenna"
          x="7"
          y="0"
          width="2"
          height="1"
          fill="var(--reward)"
        />
        <rect x="7" y="1" width="2" height="1" fill="var(--border)" />
        <rect x="1" y="5" width="1" height="3" fill="var(--accent)" />
        <rect x="14" y="5" width="1" height="3" fill="var(--accent)" />
        <rect
          x="2"
          y="2"
          width="12"
          height="11"
          fill="var(--surface-2)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect x="4" y="4" width="8" height="4" fill="var(--bg)" />
        <Face mood={mood} />
        <rect x="5" y="10" width="6" height="2" fill="var(--surface)" />
        <rect x="6" y="11" width="1" height="1" fill="var(--xp)" />
        <rect x="9" y="11" width="1" height="1" fill="var(--success)" />
        <rect x="5" y="13" width="2" height="2" fill="var(--border)" />
        <rect x="9" y="13" width="2" height="2" fill="var(--border)" />
      </svg>
    </div>
  );
}
