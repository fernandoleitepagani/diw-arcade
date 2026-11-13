import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SegBar } from './SegBar';

describe('SegBar', () => {
  it('renders on and off segments', () => {
    const { container } = render(<SegBar on={3} total={5} />);

    const segments = container.querySelectorAll('i');
    expect(segments).toHaveLength(5);
    expect(container.querySelectorAll('i:not(.off)')).toHaveLength(3);
    expect(container.querySelectorAll('i.off')).toHaveLength(2);
  });

  it('is a progressbar with aria-valuenow, min and max when labelled', () => {
    render(<SegBar on={4} total={10} label="4 de 10 pontos de domínio" />);

    const bar = screen.getByRole('progressbar', {
      name: '4 de 10 pontos de domínio',
    });
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });

  it('is aria-hidden without a label', () => {
    const { container } = render(<SegBar on={1} total={3} />);

    const bar = container.firstElementChild;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
