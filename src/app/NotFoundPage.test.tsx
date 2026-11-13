import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/caminho-inexistente']}>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('mostra o título, o Bit e o caminho de volta para a trilha', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Bit, o robô mascote' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar para a trilha' }),
    ).toHaveAttribute('href', '/');
  });
});
