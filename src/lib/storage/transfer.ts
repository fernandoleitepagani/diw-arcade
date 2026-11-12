import { SaveV1Schema, type SaveV1 } from './schema';

export const EXPORT_APP = 'diw-arcade';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface SaveExport {
  app: typeof EXPORT_APP;
  schemaVersion: number;
  exportedAt: string;
  save: SaveV1;
}

export type ImportResult =
  | { ok: true; save: SaveV1 }
  | { ok: false; error: string };

const ERRORS = {
  tooLarge: 'Arquivo grande demais: o limite é 5 MB.',
  invalidJson: 'Arquivo inválido: não foi possível ler o JSON.',
  wrongApp: 'Arquivo inválido: este arquivo não é um progresso do DIW Arcade.',
  badSave: 'Arquivo inválido: o progresso está incompleto ou corrompido.',
};

function fail(error: string): ImportResult {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function exportSave(save: SaveV1, now: Date): SaveExport {
  return {
    app: EXPORT_APP,
    schemaVersion: save.schemaVersion,
    exportedAt: now.toISOString(),
    save,
  };
}

export function parseImport(text: string): ImportResult {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    return fail(ERRORS.tooLarge);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail(ERRORS.invalidJson);
  }

  if (!isRecord(raw) || raw.app !== EXPORT_APP) {
    return fail(ERRORS.wrongApp);
  }

  const parsed = SaveV1Schema.safeParse(raw.save);
  if (!parsed.success) {
    return fail(ERRORS.badSave);
  }

  return { ok: true, save: parsed.data };
}
