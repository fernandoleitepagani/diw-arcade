import { PixelSprite } from '../../../components/pixel/PixelSprite/PixelSprite';
import './NodeDisc.css';

export type DiscState = 'done' | 'current' | 'todo';

export interface NodeDiscProps {
  state: DiscState;
}

/** 13x13 pixel discs from the prototype: X unit color, B background, O check. */
const DISC_ROWS: Record<DiscState, readonly string[]> = {
  done: [
    '.....XXX.....',
    '...XXXXXXX...',
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    '.XXXXXXXXOXX.',
    'XXXXXXXXOOXXX',
    'XXXOXXXOOXXXX',
    'XXXOOXOOXXXXX',
    '.XXXOOOXXXXX.',
    '.XXXXOXXXXXX.',
    '..XXXXXXXXX..',
    '...XXXXXXX...',
    '.....XXX.....',
  ],
  current: [
    '.....XXX.....',
    '...XXXXXXX...',
    '..XXXBBBXXX..',
    '.XXXBBBBBXXX.',
    '.XXBBXXXBBXX.',
    'XXBBXXXXXBBXX',
    'XXBBXXXXXBBXX',
    'XXBBXXXXXBBXX',
    '.XXBBXXXBBXX.',
    '.XXXBBBBBXXX.',
    '..XXXBBBXXX..',
    '...XXXXXXX...',
    '.....XXX.....',
  ],
  todo: [
    '.....XXX.....',
    '...XXXXXXX...',
    '..XXBBBBBXX..',
    '.XXBBBBBBBXX.',
    '.XBBBBBBBBBX.',
    'XXBBBBBBBBBXX',
    'XXBBBBBBBBBXX',
    'XXBBBBBBBBBXX',
    '.XBBBBBBBBBX.',
    '.XXBBBBBBBXX.',
    '..XXBBBBBXX..',
    '...XXXXXXX...',
    '.....XXX.....',
  ],
};

const PALETTE = {
  X: 'currentColor',
  B: 'var(--bg)',
  O: 'var(--on-u)',
};

/**
 * Decorative disc: the state is also in the link name, so the sprite is
 * hidden from assistive tech. It takes the unit color from `--c` on the node.
 */
export function NodeDisc({ state }: NodeDiscProps) {
  return (
    <span className={`node-disc node-disc--${state}`}>
      <PixelSprite rows={DISC_ROWS[state]} palette={PALETTE} scale={3} />
    </span>
  );
}
