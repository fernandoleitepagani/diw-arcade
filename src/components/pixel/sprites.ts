// Sprite grids copied from docs/prototype-ref/build.mjs. "." is transparent;
// every other cell must be a key of its palette.
const CURRENT = { X: 'currentColor' };

export const SPRITES = {
  bit: {
    rows: [
      '...XX...',
      '..XXXX..',
      '.XXXXXX.',
      'XXEXXEXX',
      'XXXXXXXX',
      'XXXEEXXX',
      '.XXXXXX.',
      '..X..X..',
    ],
    palette: { X: 'var(--text)', E: 'var(--bg)' },
  },
  flame: {
    rows: [
      '...X....',
      '...XX...',
      '..XXX.X.',
      '.XXXXXX.',
      '.XXYXXX.',
      'XXXYYXXX',
      '.XXYYXX.',
      '..XXXX..',
    ],
    palette: { X: 'var(--u-html)', Y: 'var(--u-js)' },
  },
  coin: {
    rows: [
      '..XXXX..',
      '.XXXXXX.',
      'XXXYYXXX',
      'XXXYYXXX',
      'XXXYYXXX',
      'XXXYYXXX',
      '.XXXXXX.',
      '..XXXX..',
    ],
    palette: { X: 'var(--u-js)', Y: 'var(--coin-in)' },
  },
  trophy: {
    rows: [
      'XXXXXXXX',
      'XXXXXXXX',
      '.XXXXXX.',
      '..XXXX..',
      '...XX...',
      '...XX...',
      '..XXXX..',
      '.XXXXXX.',
    ],
    palette: { X: 'var(--u-js)' },
  },
  cursor: {
    rows: [
      'X.......',
      'XX......',
      'XXX.....',
      'XXXX....',
      'XXXXX...',
      'XXXXXX..',
      'XXXX....',
      'XX.XX...',
      'X..XX...',
      '....X...',
    ],
    palette: CURRENT,
  },
  play: {
    rows: ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'],
    palette: CURRENT,
  },
  logo: {
    rows: [
      '........',
      'XX......',
      '.XX.....',
      '..XX....',
      '.XX.....',
      'XX......',
      '....XXXX',
      '........',
    ],
    palette: { X: 'var(--text)' },
  },
} as const satisfies Record<
  string,
  { readonly rows: readonly string[]; readonly palette: Record<string, string> }
>;

export type SpriteName = keyof typeof SPRITES;
