import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DESCRIPTION,
  PAGE_DESCRIPTIONS,
  usePageTitle,
} from './usePageTitle';

function TitleProbe({ page }: { page?: string }) {
  usePageTitle(page);
  return null;
}

function description(): string | null {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  return meta?.content ?? null;
}

describe('usePageTitle', () => {
  it('sets the title e a descrição de Revisão', () => {
    render(<TitleProbe page="Revisão" />);

    expect(document.title).toBe('DIW Arcade: Revisão');
    expect(description()).toBe(PAGE_DESCRIPTIONS.Revisão);
  });

  it('usa a descrição padrão para uma página desconhecida', () => {
    render(<TitleProbe page="Página inventada" />);

    expect(document.title).toBe('DIW Arcade: Página inventada');
    expect(description()).toBe(DEFAULT_DESCRIPTION);
  });

  it('usa o título e a descrição padrão sem página', () => {
    render(<TitleProbe />);

    expect(document.title).toBe('DIW Arcade');
    expect(description()).toBe(DEFAULT_DESCRIPTION);
  });
});
