import { describe, expect, it } from 'vitest';
import { looksPtBr } from '../text/ptbr';
import { createEmptySave } from './storage';
import { exportSave, parseImport } from './transfer';

const NOW = new Date('2026-01-05T12:00:00.000Z');

function sampleSave() {
  const save = createEmptySave(NOW);
  save.onboarded = true;
  save.xpTotal = 125;
  save.settings.newCardsPerDay = 30;
  save.introduced = { 'n01-f001': '2026-01-05' };
  save.days = {
    '2026-01-05': { xp: 25, quiz: 1, cards: 1, challenges: 0, labs: 1 },
  };
  save.labs = { 'lab-01': { 'passo-1': { done: true, xpAwarded: true } } };
  return save;
}

describe('exportSave', () => {
  it('wraps the save in the export envelope', () => {
    const save = sampleSave();

    expect(exportSave(save, NOW)).toEqual({
      app: 'diw-arcade',
      schemaVersion: 2,
      exportedAt: NOW.toISOString(),
      save,
    });
  });
});

describe('parseImport', () => {
  it('round-trips an exported save', () => {
    const save = sampleSave();

    const result = parseImport(JSON.stringify(exportSave(save, NOW)));

    expect(result).toEqual({ ok: true, save });
  });

  it('imports a v1 export with primersRead {} and all progress', () => {
    const { primersRead: _drop, ...v1 } = { ...sampleSave(), schemaVersion: 1 };
    const result = parseImport(
      JSON.stringify({ app: 'diw-arcade', schemaVersion: 1, exportedAt: NOW.toISOString(), save: v1 }),
    );

    expect(result).toEqual({
      ok: true,
      save: { ...v1, schemaVersion: 2, primersRead: {} },
    });
  });

  it('round-trips a non-empty primersRead', () => {
    const save = { ...sampleSave(), primersRead: { n01: NOW.toISOString() } };

    expect(parseImport(JSON.stringify(exportSave(save, NOW)))).toEqual({ ok: true, save });
  });

  it('rejects a future schema version', () => {
    const save = { ...sampleSave(), schemaVersion: 3 };
    const result = parseImport(JSON.stringify({ ...exportSave(sampleSave(), NOW), save }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('corrompido');
  });

  it('defaults a missing primersRead under v2', () => {
    const { primersRead: _drop, ...v2 } = sampleSave();
    const result = parseImport(
      JSON.stringify({ ...exportSave(sampleSave(), NOW), save: v2 }),
    );

    expect(result.ok && result.save.primersRead).toEqual({});
  });

  it('rejects invalid JSON with a PT-BR message', () => {
    const result = parseImport('{ not json');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('inválido');
    expect(looksPtBr(result.error)).toBe(true);
  });

  it('rejects a file from another app with a PT-BR message', () => {
    const result = parseImport(
      JSON.stringify({ ...exportSave(sampleSave(), NOW), app: 'outro-app' }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('DIW Arcade');
    expect(looksPtBr(result.error)).toBe(true);
  });

  it('rejects a schema violation with a PT-BR message', () => {
    const save = sampleSave();
    const result = parseImport(
      JSON.stringify({
        ...exportSave(save, NOW),
        save: { ...save, xpTotal: -1 },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('corrompido');
    expect(looksPtBr(result.error)).toBe(true);
  });

  it('rejects an envelope without a save', () => {
    const result = parseImport(
      JSON.stringify({ app: 'diw-arcade', schemaVersion: 1, exportedAt: NOW.toISOString() }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(looksPtBr(result.error)).toBe(true);
  });

  it('rejects an input larger than 5 MB', () => {
    const tooLarge = 'x'.repeat(5 * 1024 * 1024 + 1);

    const result = parseImport(tooLarge);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('5 MB');
    expect(looksPtBr(result.error)).toBe(true);
  });
});
