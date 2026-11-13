import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cssVars, tokens } from './tokens';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function parseCssTokens(source: string): Record<string, string> {
  const declared: Record<string, string> = {};
  const pattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;

  for (const match of source.matchAll(pattern)) {
    const name = match[1];
    const value = match[2];
    if (name && value) {
      declared[name] = value.trim();
    }
  }

  return declared;
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('design tokens', () => {
  it('keeps tokens.css and tokens.ts in sync', () => {
    const declared = parseCssTokens(css);

    expect(Object.keys(declared).sort()).toEqual(Object.values(cssVars).sort());

    for (const [key, cssName] of Object.entries(cssVars)) {
      expect(declared[cssName], cssName).toBe(tokens[key as keyof typeof tokens]);
    }
  });

  it('exposes the polish type, layout and motion scale', () => {
    expect(tokens.fontSizeH1).toBe('1.25rem');
    expect(tokens.fontSizeH2).toBe('0.875rem');
    expect(tokens.contentMax).toBe('75rem');
    expect(tokens.durMax).toBe('600ms');
  });

  it('meets the AC19 contrast table', () => {
    const backgrounds = [
      tokens.bg,
      tokens.surface,
      tokens.surface2,
      tokens.surface3,
    ];

    for (const text of [tokens.text, tokens.textMuted]) {
      for (const background of backgrounds) {
        expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
      }
    }

    for (const color of [
      tokens.accent,
      tokens.reward,
      tokens.xp,
      tokens.success,
      tokens.danger,
    ]) {
      expect(contrast(color, tokens.bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps on-accent readable on every accent fill', () => {
    for (const fill of [tokens.accent, tokens.reward, tokens.xp]) {
      expect(contrast(tokens.onAccent, fill)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
