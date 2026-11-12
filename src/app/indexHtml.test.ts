import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const PUBLIC = resolve(ROOT, 'public');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');

function meta(attribute: 'name' | 'property', key: string): string | null {
  const element = doc.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  return element?.content ?? null;
}

function link(selector: string): string | null {
  return doc.querySelector<HTMLLinkElement>(selector)?.getAttribute('href') ?? null;
}

const REQUIRED_META: readonly [property: 'name' | 'property', key: string][] = [
  ['name', 'description'],
  ['name', 'theme-color'],
  ['property', 'og:type'],
  ['property', 'og:site_name'],
  ['property', 'og:locale'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:image:width'],
  ['property', 'og:image:height'],
  ['property', 'og:image:alt'],
  ['name', 'twitter:card'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
  ['name', 'twitter:image:alt'],
];

describe('head estático', () => {
  it('declara o idioma e o título do documento', () => {
    expect(doc.documentElement.lang).toBe('pt-BR');
    expect(doc.title).toBe('DIW Arcade');
  });

  it.each(REQUIRED_META)('tem meta %s=%s com conteúdo', (attribute, key) => {
    expect(meta(attribute, key)?.trim()).toBeTruthy();
  });

  it('usa o tema, o locale e o cartão de compartilhamento certos', () => {
    expect(meta('name', 'theme-color')).toBe('#0a1128');
    expect(meta('property', 'og:locale')).toBe('pt_BR');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
  });

  it('liga o favicon SVG, os PNGs, o apple-touch-icon e o manifest', () => {
    expect(link('link[rel="icon"][type="image/svg+xml"]')).toBe(
      '/favicon.svg',
    );
    expect(link('link[rel="icon"][type="image/png"][sizes="32x32"]')).toBe(
      '/favicon-32.png',
    );
    expect(link('link[rel="icon"][type="image/png"][sizes="192x192"]')).toBe(
      '/icon-192.png',
    );
    expect(link('link[rel="apple-touch-icon"]')).toBe(
      '/apple-touch-icon.png',
    );
    expect(link('link[rel="manifest"]')).toBe('/site.webmanifest');
  });

  it('não aponta para arquivo ausente em public/', () => {
    const references = [
      ...doc.querySelectorAll<HTMLLinkElement>('link[href]'),
    ].map((element) => element.getAttribute('href'));
    const metas = [...doc.querySelectorAll<HTMLMetaElement>('meta[content]')].map(
      (element) => element.getAttribute('content'),
    );

    const missing = [...references, ...metas]
      .filter((value): value is string => value?.startsWith('/') ?? false)
      .map((value) => value.split(/[?#]/, 1)[0] ?? value)
      .filter((path) => path !== '/' && extname(path) !== '')
      .filter((path) => !existsSync(resolve(PUBLIC, `.${path}`)));

    expect(missing).toEqual([]);
  });
});
