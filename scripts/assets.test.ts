import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PUBLIC = resolve(process.cwd(), 'public');

interface PngSize {
  width: number;
  height: number;
}

/** Lê largura e altura do IHDR: assinatura (8), tamanho (4), "IHDR" (4), dados. */
function readPngSize(file: string): PngSize {
  const buffer = readFileSync(resolve(PUBLIC, file));
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buffer.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const EXPECTED_PNGS: readonly [string, number, number][] = [
  ['og.png', 1200, 630],
  ['icon-192.png', 192, 192],
  ['icon-512.png', 512, 512],
  ['apple-touch-icon.png', 180, 180],
  ['favicon-32.png', 32, 32],
];

describe('assets de compartilhamento e ícones', () => {
  it.each(EXPECTED_PNGS)('%s tem %ix%i pixels', (file, width, height) => {
    expect(readPngSize(file)).toEqual({ width, height });
  });

  it('o manifest lista ícones que existem', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(PUBLIC, 'site.webmanifest'), 'utf8'),
    ) as { theme_color?: string; icons?: { src?: string }[] };

    expect(manifest.theme_color).toBe('#0a1128');
    expect(manifest.icons?.length).toBeGreaterThan(0);

    for (const icon of manifest.icons ?? []) {
      expect(icon.src).toMatch(/^\/[\w-]+\.png$/);
      expect(existsSync(resolve(PUBLIC, icon.src!.slice(1)))).toBe(true);
    }
  });
});
