import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunResult } from './runner';

const runInIframe = vi.fn();

vi.mock('./runner', () => ({ runInIframe }));

const { SandboxFrame } = await import('./SandboxFrame');

const files = { html: '<p>oi</p>', css: '', js: '' };

function mockRun(value: RunResult): void {
  runInIframe.mockImplementation(() => ({
    iframe: document.createElement('iframe'),
    result: Promise.resolve(value),
  }));
}

async function renderAndFlush(): Promise<void> {
  render(<SandboxFrame files={files} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
}

describe('SandboxFrame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    runInIframe.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists the specific failure message from a failed run', async () => {
    const message =
      'O código recarregou ou navegou a página (location.reload / location.href).';
    mockRun({ status: 'timeout', requirements: [], errors: [message] });

    await renderAndFlush();

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Sem erros')).not.toBeInTheDocument();
  });

  it('shows Sem erros after a clean run', async () => {
    mockRun({ status: 'ok', requirements: [], errors: [] });

    await renderAndFlush();

    expect(screen.getByText('Sem erros')).toBeInTheDocument();
  });
});
