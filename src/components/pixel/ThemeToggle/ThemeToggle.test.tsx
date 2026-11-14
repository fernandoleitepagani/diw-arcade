import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'dark';
    localStorage.clear();
  });

  it('flips the theme and persists it under diw-theme', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema claro e escuro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('diw-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema claro e escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('diw-theme')).toBe('dark');
  });

  it('keeps the same accessible name in both themes', () => {
    render(<ThemeToggle />);
    const name = 'Alternar tema claro e escuro';
    expect(screen.getByRole('button', { name })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.getByRole('button', { name })).toBeTruthy();
  });
});
