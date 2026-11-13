import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bit } from './Bit';

describe('Bit', () => {
  it('renders the labelled sprite and the optional line', () => {
    render(<Bit line="Mandou bem!" scale={8} />);

    expect(
      screen.getByRole('img', { name: 'Bit, o robô mascote' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mandou bem!')).toBeInTheDocument();
  });

  it('omits the line when none is given', () => {
    const { container } = render(<Bit scale={8} />);

    expect(container.querySelector('p')).toBeNull();
  });
});
