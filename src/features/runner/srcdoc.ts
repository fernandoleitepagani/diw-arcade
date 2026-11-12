import type { CodeFiles, JsonValue, Requirement } from '../../content/schema';

export interface SrcdocConfig {
  nonce: string;
  mode: 'preview' | 'test';
  parentOrigin: string;
  requirements?: readonly Requirement[];
  mocks?: Record<string, JsonValue>;
}

const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: blob:; font-src data:; media-src data:; connect-src 'none'; " +
  "frame-src 'none'; form-action 'none'; base-uri 'none'";

/** JSON that cannot close the surrounding `<script>` element. */
function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * The full document placed in the sandboxed iframe. The CSP is a meta tag in
 * the head so it applies before the harness and before any user script runs.
 */
export function buildSrcdoc(
  files: CodeFiles,
  config: SrcdocConfig,
  harnessSource: string,
  libCss = '',
): string {
  const userJs = files.js.replace(/<\/script/gi, '<\\/script');
  const userCss = files.css.replace(/<\/style/gi, '<\\/style');

  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">\n' +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">\n` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    `<script>window.__DIW__=${embedJson(config)}</script><script>${harnessSource}</script>\n` +
    `<style>${libCss}</style><style>${userCss}</style></head>\n` +
    `<body>${files.html}<script>${userJs}</script></body></html>`
  );
}
