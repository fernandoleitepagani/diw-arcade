import { PixelSprite } from '../PixelSprite/PixelSprite';
import { SPRITES } from '../sprites';
import './Bit.css';

export interface BitProps {
  line?: string;
  scale: number;
}

/** Bit, the robot sprite, with an optional line of dialogue under it. */
export function Bit({ line, scale }: BitProps) {
  return (
    <div className="bit">
      <PixelSprite
        rows={SPRITES.bit.rows}
        palette={SPRITES.bit.palette}
        scale={scale}
        label="Bit, o robô mascote"
      />
      {line ? <p className="bit__line">{line}</p> : null}
    </div>
  );
}
