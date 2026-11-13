import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LessonStepper } from './LessonStepper';

const steps = {
  ler: 'indisponivel',
  praticar: 'feito',
  fixar: 'pendente',
  construir: 'pendente',
} as const;

function setup(current: 'ler' | 'praticar' | 'fixar' | 'construir') {
  render(
    <MemoryRouter>
      <LessonStepper nodeId="n07" steps={steps} current={current} />
    </MemoryRouter>,
  );
}

describe('LessonStepper', () => {
  it('lists the four steps in order', () => {
    setup('fixar');
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Ler'),
      expect.stringContaining('Praticar'),
      expect.stringContaining('Fixar'),
      expect.stringContaining('Construir'),
    ]);
  });

  it('marks only the selected step with aria-current="step"', () => {
    setup('fixar');
    const current = document.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Fixar');
  });

  it('links each step to its ?passo= and states its status in text', () => {
    setup('fixar');
    expect(screen.getByRole('link', { name: /Praticar/ })).toHaveAttribute(
      'href',
      '/no/n07?passo=praticar',
    );
    expect(screen.getByRole('link', { name: /Praticar/ })).toHaveTextContent('feito');
    expect(screen.getByRole('link', { name: /Fixar/ })).toHaveTextContent('pendente');
    expect(screen.getByRole('link', { name: /Ler/ })).toHaveTextContent('em breve');
  });
});
