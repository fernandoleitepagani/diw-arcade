import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY,
  createEmptySave,
  exportSave,
  parseImport,
  type SaveV1,
  type StorageLike,
} from '../../lib/storage';
import { FIXED_NOW, renderWithProgress } from '../../test/renderWithProgress';
import { SettingsPage } from './SettingsPage';

function persisted(storage: StorageLike): SaveV1 {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) throw new Error('Nenhum progresso salvo');
  return JSON.parse(raw) as SaveV1;
}

function importFile(save: SaveV1): File {
  return new File([JSON.stringify(exportSave(save, FIXED_NOW))], 'progresso.json', {
    type: 'application/json',
  });
}

describe('SettingsPage', () => {
  it('keeps sound off by default', () => {
    renderWithProgress(<SettingsPage />);

    expect(screen.getByRole('checkbox', { name: 'Som' })).not.toBeChecked();
  });

  it('persists the intense daily goal', async () => {
    const user = userEvent.setup();
    const { storage } = renderWithProgress(<SettingsPage />);

    const intense = screen.getByRole('radio', { name: 'Intenso (100 XP)' });
    await user.click(intense);

    expect(intense).toBeChecked();
    expect(persisted(storage).settings.dailyGoal).toBe(100);
  });

  it('persists the daily card caps', async () => {
    const user = userEvent.setup();
    const { storage } = renderWithProgress(<SettingsPage />);

    await user.selectOptions(
      screen.getByLabelText('Novas cartas por dia'),
      '30',
    );
    await user.selectOptions(screen.getByLabelText('Revisões por dia'), '200');

    const save = persisted(storage);
    expect(save.settings.newCardsPerDay).toBe(30);
    expect(save.settings.reviewsPerDay).toBe(200);
  });

  it('persists the sound switch', async () => {
    const user = userEvent.setup();
    const { storage } = renderWithProgress(<SettingsPage />);

    const sound = screen.getByRole('checkbox', { name: 'Som' });
    await user.click(sound);

    expect(sound).toBeChecked();
    expect(persisted(storage).settings.sound).toBe(true);
  });

  it('exports a file that parseImport accepts', async () => {
    const user = userEvent.setup();
    const exported: Blob[] = [];
    let downloadedName = '';

    const createObjectURL = vi.fn((blob: Blob) => {
      exported.push(blob);
      return 'blob:teste';
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        downloadedName = this.download;
      },
    );

    renderWithProgress(<SettingsPage />);
    await user.click(
      screen.getByRole('button', { name: 'Exportar progresso' }),
    );

    expect(downloadedName).toMatch(
      /^diw-arcade-progresso-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const blob = exported[0];
    if (blob === undefined) throw new Error('Exportação não gerou arquivo');

    const result = parseImport(await blob.text());
    expect(result.ok).toBe(true);

    vi.restoreAllMocks();
  });

  it('shows an inline error for an invalid import', async () => {
    const user = userEvent.setup();
    renderWithProgress(<SettingsPage />);

    await user.upload(
      screen.getByLabelText('Importar progresso'),
      new File(['{ não é json'], 'quebrado.json', { type: 'application/json' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/inválido/i);
  });

  it('replaces the save only after confirming a valid import', async () => {
    const user = userEvent.setup();
    const imported = createEmptySave(FIXED_NOW);
    imported.onboarded = true;
    imported.xpTotal = 999;

    const { storage } = renderWithProgress(<SettingsPage />, {
      save: { xpTotal: 10 },
    });

    await user.upload(
      screen.getByLabelText('Importar progresso'),
      importFile(imported),
    );

    const question = await screen.findByText('Substituir progresso atual?');
    expect(persisted(storage).xpTotal).toBe(10);

    await user.click(
      within(question.parentElement as HTMLElement).getByRole('button', {
        name: 'Confirmar',
      }),
    );

    expect(persisted(storage).xpTotal).toBe(999);
  });

  it('gates the reset on typing APAGAR', async () => {
    const user = userEvent.setup();
    const { storage } = renderWithProgress(<SettingsPage />, {
      save: { xpTotal: 42 },
    });

    const field = screen.getByLabelText('Digite APAGAR para confirmar');
    const confirm = screen.getByRole('button', { name: 'Confirmar' });

    expect(confirm).toBeDisabled();

    await user.type(field, 'apagar');
    expect(confirm).toBeDisabled();

    await user.clear(field);
    await user.type(field, 'APAGAR');
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(persisted(storage).xpTotal).toBe(0);
  });
});
