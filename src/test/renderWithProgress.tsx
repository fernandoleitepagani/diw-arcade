import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { ProgressProvider } from '../app/ProgressProvider';
import { ToastProvider } from '../components/ui/Toast/Toast';
import type { ProgressContent } from '../lib/progress/events';
import {
  SaveV1Schema,
  createEmptySave,
  persistSave,
  type SaveV1,
  type StorageLike,
} from '../lib/storage';

export const FIXED_NOW = new Date('2026-01-05T12:00:00.000Z');

export interface RenderWithProgressOptions {
  /** Top-level overrides; nested objects keep their schema defaults. */
  save?: Partial<SaveV1>;
  now?: Date;
  clock?: () => Date;
  route?: string;
  initialEntries?: string[];
  storage?: StorageLike;
  contentIndex?: ProgressContent;
}

export class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

export function createMemoryStorage(): StorageLike {
  return new MemoryStorage();
}

function seedSave(now: Date, override: Partial<SaveV1> | undefined): SaveV1 {
  return SaveV1Schema.parse({
    ...createEmptySave(now),
    ...override,
    onboarded: override?.onboarded ?? true,
  });
}

/**
 * Renders a component with the real toast and progress providers, an
 * in-memory save (onboarded by default), a fixed clock and a MemoryRouter.
 */
export function renderWithProgress(
  ui: ReactNode,
  options: RenderWithProgressOptions = {},
) {
  const now = options.now ?? FIXED_NOW;
  const clock = options.clock ?? (() => now);
  const storage = options.storage ?? createMemoryStorage();
  const save = seedSave(now, options.save);
  persistSave(storage, save);

  const initialEntries = options.initialEntries ?? [options.route ?? '/'];

  const result = render(
    <ToastProvider>
      <ProgressProvider
        storage={storage}
        clock={clock}
        contentIndex={options.contentIndex}
      >
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </ProgressProvider>
    </ToastProvider>,
  );

  return { ...result, storage, now, save };
}
