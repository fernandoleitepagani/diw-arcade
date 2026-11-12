import { describe, expect, it } from 'vitest';
import { buildSrcdoc, type SrcdocConfig } from './srcdoc';

const files = {
  html: '<main id="app">Olá</main>',
  css: '.app { color: red; }',
  js: '',
};

const config: SrcdocConfig = {
  nonce: 'nonce-123',
  mode: 'test',
  parentOrigin: 'https://diw-arcade.test',
  requirements: [],
  mocks: {},
};

const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";

describe('buildSrcdoc', () => {
  it('places the CSP meta inside the head before any script', () => {
    const srcdoc = buildSrcdoc(files, config, '/* harness */');

    expect(srcdoc).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    );
    expect(srcdoc.indexOf('Content-Security-Policy')).toBeLessThan(
      srcdoc.indexOf('<script>window.__DIW__='),
    );
    expect(srcdoc.startsWith('<!doctype html><html lang="pt-BR"><head>')).toBe(
      true,
    );
    expect(srcdoc).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  });

  it('lays out library CSS, user CSS, body HTML and user JS', () => {
    const srcdoc = buildSrcdoc(files, config, '/* harness */', 'body{margin:0}');

    expect(srcdoc).toContain('<style>body{margin:0}</style>');
    expect(srcdoc).toContain('<style>.app { color: red; }</style>');
    expect(srcdoc).toContain(
      '<body><main id="app">Olá</main><script></script></body>',
    );
    expect(srcdoc).toContain('<script>window.__DIW__=');
    expect(srcdoc).toContain('<script>/* harness */</script>');
  });

  it('defaults absent library CSS to an empty style element', () => {
    const srcdoc = buildSrcdoc(files, config, 'h');

    expect(srcdoc).not.toContain('undefined');
    expect(srcdoc).toContain('<style></style>');
  });

  it('escapes user CSS closers so they cannot end the style element early', () => {
    const srcdoc = buildSrcdoc(
      { html: '', css: 'body{}</style><b>', js: '' },
      config,
      'h',
    );

    expect(srcdoc).not.toContain('</style><b>');
    expect(srcdoc).toContain('<\\/style><b>');
    expect(srcdoc.match(/<\/style>/g)).toHaveLength(2);
  });

  it('escapes config markup and user script closers', () => {
    const srcdoc = buildSrcdoc(
      { html: '', css: '', js: 'console.log("</script><b>")' },
      { ...config, mocks: { '/api': '<b>valor</b>' } },
      'h',
    );

    expect(srcdoc).not.toContain('"<b>valor</b>"');
    expect(srcdoc).toContain('\\u003cb>valor\\u003c/b>');
    expect(srcdoc).toContain('<\\/script><b>');
    expect(srcdoc.match(/<\/script>/g)).toHaveLength(3);
  });
});
