import { describe, expect, it } from 'vitest';
import {
  absolutizeSocialUrls,
  fontPreloadTags,
  withOgUrl,
} from './htmlHead';

const HEAD_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta property="og:image" content="/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:url" content="/" />
    <meta name="twitter:image" content="/og.png" />
  </head>
</html>`;

describe('fontPreloadTags', () => {
  it('pré-carrega Inter latin 400 e Press Start 2P latin 400', () => {
    const files = [
      'assets/inter-latin-400-normal-C38fXH4l.woff2',
      'assets/inter-latin-600-normal-LgqL8muc.woff2',
      'assets/inter-latin-400-normal-77YHD8bZ.woff',
      'assets/press-start-2p-latin-400-normal-_wFEWmAB.woff2',
      'assets/press-start-2p-latin-ext-400-normal-DpfYvR5A.woff2',
      'assets/jetbrains-mono-latin-400-normal-abc123.woff2',
    ];

    const tags = fontPreloadTags(files);

    expect(tags).toEqual([
      '<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/inter-latin-400-normal-C38fXH4l.woff2">',
      '<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/press-start-2p-latin-400-normal-_wFEWmAB.woff2">',
    ]);
  });

  it('não gera tags quando as fontes críticas não estão no bundle', () => {
    expect(fontPreloadTags(['assets/outra-latin-400-normal-abc.woff2'])).toEqual(
      [],
    );
  });
});

describe('absolutizeSocialUrls', () => {
  it('torna og:image, og:url e twitter:image absolutos', () => {
    const result = absolutizeSocialUrls(HEAD_HTML, 'https://x.dev');

    expect(result).toContain(
      '<meta property="og:image" content="https://x.dev/og.png" />',
    );
    expect(result).toContain(
      '<meta property="og:url" content="https://x.dev/" />',
    );
    expect(result).toContain(
      '<meta name="twitter:image" content="https://x.dev/og.png" />',
    );
    expect(result).toContain(
      '<meta property="og:image:width" content="1200" />',
    );
  });

  it('deixa o HTML inalterado sem URL do site', () => {
    expect(absolutizeSocialUrls(HEAD_HTML, undefined)).toBe(HEAD_HTML);
  });
});

describe('withOgUrl', () => {
  const WITHOUT_OG_URL = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta property="og:image" content="/og.png" />
  </head>
  <body></body>
</html>`;

  it('injeta a og:url absoluta no head', () => {
    const result = withOgUrl(WITHOUT_OG_URL, 'https://x.dev');

    expect(result).toContain(
      '<meta property="og:url" content="https://x.dev/" />',
    );
    expect(result.indexOf('og:url')).toBeLessThan(result.indexOf('</head>'));
  });

  it('escapa o conteúdo HTML da og:url', () => {
    const result = withOgUrl(WITHOUT_OG_URL, 'https://x.dev/?a=1&b=2');

    expect(result).toContain(
      '<meta property="og:url" content="https://x.dev/?a=1&amp;b=2" />',
    );
  });

  it('omite a og:url quando não há URL do site', () => {
    expect(withOgUrl(WITHOUT_OG_URL, undefined)).toBe(WITHOUT_OG_URL);
  });

  it('não duplica uma og:url já presente no HTML', () => {
    const result = withOgUrl(HEAD_HTML, 'https://x.dev');

    expect(result.match(/og:url/g)).toHaveLength(1);
  });
});
