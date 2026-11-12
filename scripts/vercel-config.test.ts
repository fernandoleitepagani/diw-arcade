import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface HeaderRule {
  key: string;
  value: string;
}

interface HeaderEntry {
  source: string;
  headers: HeaderRule[];
}

interface VercelConfig {
  rewrites?: { source: string; destination: string }[];
  headers?: HeaderEntry[];
}

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig;

function cacheControlOf(source: string): string | undefined {
  const entry = config.headers?.find((header) => header.source === source);
  return entry?.headers.find((header) => header.key === 'Cache-Control')?.value;
}

function headerValue(key: string): string | undefined {
  return config.headers
    ?.flatMap((entry) => entry.headers)
    .find((header) => header.key === key)?.value;
}

describe('vercel.json', () => {
  it('mantém o rewrite da SPA', () => {
    expect(config.rewrites).toEqual([
      { source: '/(.*)', destination: '/index.html' },
    ]);
  });

  it('cacheia assets com hash para sempre', () => {
    expect(cacheControlOf('/assets/(.*)')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('não cacheia o restante', () => {
    expect(cacheControlOf('/((?!assets/).*)')).toBe('no-cache');
  });

  it('mantém os cabeçalhos de segurança', () => {
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('Referrer-Policy')).toBe('no-referrer');
  });
});
