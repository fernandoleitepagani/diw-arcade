import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ICON_ROWS } from '../icons';
import { SPRITES } from '../sprites';
import { PixelIcon } from '../PixelIcon/PixelIcon';
import { PixelSprite } from './PixelSprite';

describe('PixelSprite', () => {
  it('renders one rect per filled cell', () => {
    const { container } = render(
      <PixelSprite
        rows={['X.X', '.X.']}
        palette={{ X: '#123456' }}
        scale={1}
      />,
    );

    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(3);
    expect(rects[0]).toHaveAttribute('fill', '#123456');
    expect(rects[1]).toHaveAttribute('x', '2');
    expect(rects[1]).toHaveAttribute('y', '0');
  });

  it('is aria-hidden without a label and role img with one', () => {
    const { container, unmount } = render(
      <PixelSprite rows={['X']} palette={{ X: '#000' }} scale={1} />,
    );

    const hidden = container.querySelector('svg');
    expect(hidden).toHaveAttribute('aria-hidden', 'true');
    expect(hidden).not.toHaveAttribute('role');
    unmount();

    render(
      <PixelSprite
        rows={['X']}
        palette={{ X: '#000' }}
        scale={1}
        label="Moeda"
      />,
    );

    const labelled = screen.getByRole('img', { name: 'Moeda' });
    expect(labelled).not.toHaveAttribute('aria-hidden');
  });

  it('every grid in icons.ts and sprites.ts is rectangular and uses only palette keys', () => {
    for (const [name, { rows, palette }] of Object.entries(SPRITES)) {
      const widths = new Set(rows.map((row) => row.length));
      expect(widths.size, `sprite ${name} is rectangular`).toBe(1);
      for (const row of rows) {
        for (const cell of row) {
          expect(
            cell === '.' || cell in palette,
            `sprite ${name} cell ${cell}`,
          ).toBe(true);
        }
      }
    }

    for (const [name, rows] of Object.entries(ICON_ROWS)) {
      const widths = new Set(rows.map((row) => row.length));
      expect(widths.size, `icon ${name} is rectangular`).toBe(1);
      for (const row of rows) {
        for (const cell of row) {
          expect(
            cell === '.' || cell === 'X',
            `icon ${name} cell ${cell}`,
          ).toBe(true);
        }
      }
    }
  });

  it('PixelIcon name="check" renders 8x8 at scale 2 (16 px)', () => {
    const { container } = render(<PixelIcon name="check" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 8 8');
  });
});
