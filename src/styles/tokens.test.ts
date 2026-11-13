import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES, cssVars, tokens } from './tokens';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const themeCss = readFileSync('src/styles/theme.css', 'utf8');

function parseThemeBlocks(source: string): Record<'dark' | 'light', Record<string, string>> {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: Record<'dark' | 'light', Record<string, string>> = { dark: {}, light: {} };

  for (const match of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1] ?? '';
    const body = match[2] ?? '';
    if (selector.includes('data-theme=dark')) {
      Object.assign(blocks.dark, parseCssTokens(body));
    } else if (selector.includes('data-theme=light')) {
      Object.assign(blocks.light, parseCssTokens(body));
    }
  }

  return blocks;
}

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

  it('keeps theme.css in sync with THEMES', () => {
    const blocks = parseThemeBlocks(themeCss);

    for (const theme of ['dark', 'light'] as const) {
      const declared = blocks[theme];
      const names = Object.keys(declared).map((name) => name.slice(2));

      expect(Object.keys(THEMES[theme]).sort(), theme).toEqual(names.sort());

      for (const [key, value] of Object.entries(THEMES[theme])) {
        expect(declared[`--${key}`], `${theme} --${key}`).toBe(value);
      }
    }
  });

  it('meets AA for text and muted on bg and panel in both themes', () => {
    for (const theme of Object.values(THEMES)) {
      for (const text of [theme.text, theme.muted]) {
        for (const background of [theme.bg, theme.panel]) {
          expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('keeps faint, unit colors and on-u at 3:1 in both themes', () => {
    for (const theme of Object.values(THEMES)) {
      for (const background of [theme.bg, theme.panel]) {
        expect(contrast(theme.faint, background)).toBeGreaterThanOrEqual(3);
        for (const [key, value] of Object.entries(theme)) {
          if (key.startsWith('u-')) {
            expect(contrast(value, background), key).toBeGreaterThanOrEqual(3);
          }
        }
      }

      for (const [key, value] of Object.entries(theme)) {
        if (key.startsWith('u-')) {
          expect(contrast(theme['on-u'], value), key).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('keeps btn-fg on btn-bg and ok and bad on panel at 4.5', () => {
    for (const theme of Object.values(THEMES)) {
      expect(contrast(theme['btn-fg'], theme['btn-bg'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.ok, theme.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.bad, theme.panel)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
