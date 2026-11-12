import { afterEach, describe, expect, it } from 'vitest';
import type { Requirement } from '../../content/schema';
import { fixtureChallenge } from '../../test/fixtures';
import { runInIframe } from './runner';
import { runInJsdom } from './jsdomRunner';

const files = {
  html: '<p id="alvo">Olá</p>',
  css: '#alvo { color: red; }',
  js: '',
};

const requirements: Requirement[] = [
  {
    id: 'alvo-existe',
    label: 'O alvo existe.',
    check: { kind: 'exists', selector: '#alvo' },
  },
];

function nonceFromSrcdoc(srcdoc: string): string {
  const match = /"nonce":"([^"]+)"/.exec(srcdoc);
  if (!match?.[1]) {
    throw new Error('nonce não encontrado no srcdoc');
  }
  return match[1];
}

async function waitForSrcdoc(iframe: HTMLIFrameElement): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (iframe.srcdoc) {
      return iframe.srcdoc;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('srcdoc não foi definido');
}

function send(
  iframe: HTMLIFrameElement,
  data: unknown,
  source: MessageEventSource | null = iframe.contentWindow,
): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

const containers: HTMLElement[] = [];

function container(): HTMLElement {
  const element = document.createElement('div');
  document.body.appendChild(element);
  containers.push(element);
  return element;
}

afterEach(() => {
  for (const element of containers.splice(0)) {
    element.remove();
  }
});

describe('runInIframe', () => {
  it('mounts one fresh iframe with exactly allow-scripts', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'preview',
      timeoutMs: 500,
    });

    expect(host.firstElementChild).toBe(iframe);
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');

    const srcdoc = await waitForSrcdoc(iframe);
    send(iframe, {
      type: 'diw:ready',
      nonce: nonceFromSrcdoc(srcdoc),
      errors: [],
    });

    await expect(result).resolves.toEqual({
      status: 'ok',
      requirements: [],
      errors: [],
    });
  });

  it('accepts a valid result only from the iframe window', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'test',
      requirements,
      timeoutMs: 500,
    });
    const nonce = nonceFromSrcdoc(await waitForSrcdoc(iframe));

    send(
      iframe,
      {
        type: 'diw:result',
        nonce,
        requirements: [{ id: 'alvo-existe', passed: true }],
        errors: ['aviso'],
      },
      iframe.contentWindow,
    );

    await expect(result).resolves.toEqual({
      status: 'ok',
      requirements: [{ id: 'alvo-existe', passed: true }],
      errors: ['aviso'],
    });
  });

  it('ignores a message from the wrong source', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'test',
      requirements,
      timeoutMs: 40,
    });
    const nonce = nonceFromSrcdoc(await waitForSrcdoc(iframe));

    send(
      iframe,
      {
        type: 'diw:result',
        nonce,
        requirements: [{ id: 'alvo-existe', passed: true }],
        errors: [],
      },
      window,
    );

    const value = await result;
    expect(value.status).toBe('timeout');
    expect(value.requirements).toEqual([
      {
        id: 'alvo-existe',
        passed: false,
        message: 'Tempo esgotado (loop infinito?)',
      },
    ]);
  });

  it('ignores a message with the wrong nonce', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'test',
      requirements,
      timeoutMs: 40,
    });
    await waitForSrcdoc(iframe);

    send(iframe, {
      type: 'diw:result',
      nonce: 'nonce-errado',
      requirements: [{ id: 'alvo-existe', passed: true }],
      errors: [],
    });

    await expect(result).resolves.toMatchObject({ status: 'timeout' });
  });

  it('ignores a message with the wrong shape', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'test',
      requirements,
      timeoutMs: 40,
    });
    const nonce = nonceFromSrcdoc(await waitForSrcdoc(iframe));

    send(iframe, {
      type: 'diw:result',
      nonce,
      requirements: 'todos',
      errors: [],
    });

    await expect(result).resolves.toMatchObject({ status: 'timeout' });
  });

  it('removes the iframe and fails every requirement on timeout', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'test',
      requirements,
      timeoutMs: 20,
    });
    await waitForSrcdoc(iframe);

    const value = await result;

    expect(value).toEqual({
      status: 'timeout',
      requirements: [
        {
          id: 'alvo-existe',
          passed: false,
          message: 'Tempo esgotado (loop infinito?)',
        },
      ],
      errors: [],
    });
    expect(host.querySelector('iframe')).toBeNull();
  });
});

describe('runInJsdom', () => {
  it('passes the reference solution and fails the starter', async () => {
    const solution = await runInJsdom(fixtureChallenge, fixtureChallenge.solution);

    expect(solution.passed).toBe(true);
    expect(solution.results.every((result) => result.passed)).toBe(true);

    const starter = await runInJsdom(fixtureChallenge, fixtureChallenge.starter);

    expect(starter.passed).toBe(false);
    expect(starter.results.some((result) => !result.passed)).toBe(true);
  });
});
