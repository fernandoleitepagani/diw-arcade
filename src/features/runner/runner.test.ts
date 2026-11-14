import { afterEach, describe, expect, it } from 'vitest';
import type { Requirement } from '../../content/schema';
import { fixtureChallenge } from '../../test/fixtures';
import {
  NAVIGATION_MESSAGE,
  runInIframe,
  START_FAILED_MESSAGE,
  TIMEOUT_MESSAGE,
} from './runner';
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
  // v4: submit must work in the sandbox, so allow-forms joins allow-scripts.
  it('mounts one fresh iframe with exactly allow-scripts allow-forms', async () => {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'preview',
      timeoutMs: 500,
    });

    expect(host.firstElementChild).toBe(iframe);
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms');

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
    // v4: without diw:started the run now fails as START_FAILED, so start it.
    send(iframe, { type: 'diw:started', nonce });

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
        message: TIMEOUT_MESSAGE,
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

  // v4: a harness that never sent diw:started is START_FAILED, not a timeout.
  it('removes the iframe and fails every requirement when the sandbox never starts', async () => {
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
        { id: 'alvo-existe', passed: false, message: START_FAILED_MESSAGE },
      ],
      errors: [START_FAILED_MESSAGE],
    });
    expect(host.querySelector('iframe')).toBeNull();
  });
});

describe('runInIframe lifecycle', () => {
  async function start(options: {
    mode?: 'preview' | 'test';
    timeoutMs?: number;
    startTimeoutMs?: number;
  }) {
    const host = container();
    const { iframe, result } = runInIframe(host, files, {
      mode: 'test',
      requirements,
      ...options,
    });
    const nonce = nonceFromSrcdoc(await waitForSrcdoc(iframe));
    return { host, iframe, result, nonce };
  }

  it('(a) fails with START_FAILED_MESSAGE when diw:started never arrives', async () => {
    const { host, result } = await start({ startTimeoutMs: 20, timeoutMs: 500 });

    await expect(result).resolves.toEqual({
      status: 'timeout',
      requirements: [
        { id: 'alvo-existe', passed: false, message: START_FAILED_MESSAGE },
      ],
      errors: [START_FAILED_MESSAGE],
    });
    expect(host.querySelector('iframe')).toBeNull();
  });

  it('(b) fails with TIMEOUT_MESSAGE when started but never answered', async () => {
    const { host, iframe, result, nonce } = await start({
      startTimeoutMs: 500,
      timeoutMs: 60,
    });
    send(iframe, { type: 'diw:started', nonce });

    await expect(result).resolves.toEqual({
      status: 'timeout',
      requirements: [
        { id: 'alvo-existe', passed: false, message: TIMEOUT_MESSAGE },
      ],
      errors: [TIMEOUT_MESSAGE],
    });
    expect(host.querySelector('iframe')).toBeNull();
  });

  it('(c) fails at once with NAVIGATION_MESSAGE on diw:unload after started', async () => {
    const { host, iframe, result, nonce } = await start({ timeoutMs: 5000 });
    send(iframe, { type: 'diw:started', nonce });
    const before = performance.now();
    send(iframe, { type: 'diw:unload', nonce });

    await expect(result).resolves.toEqual({
      status: 'timeout',
      requirements: [
        { id: 'alvo-existe', passed: false, message: NAVIGATION_MESSAGE },
      ],
      errors: [NAVIGATION_MESSAGE],
    });
    expect(performance.now() - before).toBeLessThan(500);
    expect(host.querySelector('iframe')).toBeNull();
  });

  it('(c) treats diw:unload while still loading as navigation', async () => {
    const { iframe, result, nonce } = await start({ timeoutMs: 5000 });
    send(iframe, { type: 'diw:unload', nonce });

    await expect(result).resolves.toMatchObject({
      status: 'timeout',
      errors: [NAVIGATION_MESSAGE],
    });
  });

  it('(d) fails with NAVIGATION_MESSAGE on a second diw:started', async () => {
    const { host, iframe, result, nonce } = await start({ timeoutMs: 5000 });
    send(iframe, { type: 'diw:started', nonce });
    send(iframe, { type: 'diw:started', nonce });

    await expect(result).resolves.toMatchObject({
      status: 'timeout',
      errors: [NAVIGATION_MESSAGE],
    });
    expect(host.querySelector('iframe')).toBeNull();
  });

  it('(e) resolves ok with a diw:result after diw:started', async () => {
    const { iframe, result, nonce } = await start({ timeoutMs: 5000 });
    send(iframe, { type: 'diw:started', nonce });
    send(iframe, {
      type: 'diw:result',
      nonce,
      requirements: [{ id: 'alvo-existe', passed: true }],
      errors: [],
    });

    await expect(result).resolves.toEqual({
      status: 'ok',
      requirements: [{ id: 'alvo-existe', passed: true }],
      errors: [],
    });
  });

  it('(e) in preview mode ignores a diw:unload after diw:ready', async () => {
    const { iframe, result, nonce } = await start({
      mode: 'preview',
      timeoutMs: 5000,
    });
    send(iframe, { type: 'diw:started', nonce });
    send(iframe, { type: 'diw:ready', nonce, errors: [] });
    send(iframe, { type: 'diw:unload', nonce });

    await expect(result).resolves.toEqual({
      status: 'ok',
      requirements: [],
      errors: [],
    });
  });

  it('(f) ignores diw:started and diw:unload from the wrong source, nonce or shape', async () => {
    const { iframe, result, nonce } = await start({
      startTimeoutMs: 500,
      timeoutMs: 80,
    });
    send(iframe, { type: 'diw:started', nonce });

    for (const type of ['diw:started', 'diw:unload']) {
      send(iframe, { type, nonce }, window);
      send(iframe, { type, nonce: 'nonce-errado' });
      send(iframe, { type, nonce: 42 });
      send(iframe, { type });
    }

    await expect(result).resolves.toMatchObject({
      status: 'timeout',
      errors: [TIMEOUT_MESSAGE],
    });
  });

  it('(f) ignores a diw:started from the wrong source while loading', async () => {
    const { iframe, result, nonce } = await start({
      startTimeoutMs: 40,
      timeoutMs: 500,
    });
    send(iframe, { type: 'diw:started', nonce }, window);

    await expect(result).resolves.toMatchObject({
      errors: [START_FAILED_MESSAGE],
    });
  });

  // v4: AC4 a diw:unload is provisional; beforeunload also fires for mailto:/tel: links.
  describe('provisional diw:unload', () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it('keeps running when diw:survived follows diw:unload, and a later diw:result is ok', async () => {
      const { iframe, result, nonce } = await start({ timeoutMs: 5000 });
      send(iframe, { type: 'diw:started', nonce });
      send(iframe, { type: 'diw:unload', nonce });
      await wait(20);
      send(iframe, { type: 'diw:survived', nonce });
      // Longer than any sane grace period: the pending failure must be gone.
      await wait(450);
      send(iframe, {
        type: 'diw:result',
        nonce,
        requirements: [{ id: 'alvo-existe', passed: true }],
        errors: [],
      });

      await expect(result).resolves.toEqual({
        status: 'ok',
        requirements: [{ id: 'alvo-existe', passed: true }],
        errors: [],
      });
    });

    it('fails with NAVIGATION_MESSAGE after a short grace when no diw:survived comes', async () => {
      const { host, iframe, result, nonce } = await start({ timeoutMs: 5000 });
      send(iframe, { type: 'diw:started', nonce });
      const before = performance.now();
      send(iframe, { type: 'diw:unload', nonce });

      await expect(result).resolves.toEqual({
        status: 'timeout',
        requirements: [
          { id: 'alvo-existe', passed: false, message: NAVIGATION_MESSAGE },
        ],
        errors: [NAVIGATION_MESSAGE],
      });
      const elapsed = performance.now() - before;
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(1000);
      expect(host.querySelector('iframe')).toBeNull();
    });

    it('fails again when a real unload follows a diw:survived', async () => {
      const { iframe, result, nonce } = await start({ timeoutMs: 5000 });
      send(iframe, { type: 'diw:started', nonce });
      send(iframe, { type: 'diw:unload', nonce });
      send(iframe, { type: 'diw:survived', nonce });
      send(iframe, { type: 'diw:unload', nonce });

      await expect(result).resolves.toMatchObject({
        status: 'timeout',
        errors: [NAVIGATION_MESSAGE],
      });
    });

    it('still fails at once on a second diw:started during the grace period', async () => {
      const { iframe, result, nonce } = await start({ timeoutMs: 5000 });
      send(iframe, { type: 'diw:started', nonce });
      send(iframe, { type: 'diw:unload', nonce });
      const before = performance.now();
      send(iframe, { type: 'diw:started', nonce });

      await expect(result).resolves.toMatchObject({ errors: [NAVIGATION_MESSAGE] });
      expect(performance.now() - before).toBeLessThan(40);
    });

    it('ignores a diw:survived from the wrong source, nonce or shape', async () => {
      const { iframe, result, nonce } = await start({ timeoutMs: 5000 });
      send(iframe, { type: 'diw:started', nonce });
      send(iframe, { type: 'diw:unload', nonce });
      send(iframe, { type: 'diw:survived', nonce }, window);
      send(iframe, { type: 'diw:survived', nonce: 'nonce-errado' });
      send(iframe, { type: 'diw:survived', nonce: 42 });
      send(iframe, { type: 'diw:survived' });

      await expect(result).resolves.toMatchObject({
        status: 'timeout',
        errors: [NAVIGATION_MESSAGE],
      });
    });

    it('in preview mode ignores diw:unload and diw:survived after diw:ready', async () => {
      const { iframe, result, nonce } = await start({
        mode: 'preview',
        timeoutMs: 5000,
      });
      send(iframe, { type: 'diw:started', nonce });
      send(iframe, { type: 'diw:ready', nonce, errors: [] });
      send(iframe, { type: 'diw:unload', nonce });
      send(iframe, { type: 'diw:survived', nonce });
      await wait(300);

      await expect(result).resolves.toEqual({
        status: 'ok',
        requirements: [],
        errors: [],
      });
    });
  });

  it('(g) removes the iframe on every failure path', async () => {
    const hosts: HTMLElement[] = [];
    for (const signal of ['unload', 'startedTwice', 'start', 'total']) {
      const { host, iframe, result, nonce } = await start({
        startTimeoutMs: signal === 'start' ? 20 : 500,
        timeoutMs: signal === 'total' ? 40 : 500,
      });
      hosts.push(host);
      if (signal === 'unload') {
        send(iframe, { type: 'diw:unload', nonce });
      } else if (signal === 'startedTwice') {
        send(iframe, { type: 'diw:started', nonce });
        send(iframe, { type: 'diw:started', nonce });
      } else if (signal === 'total') {
        send(iframe, { type: 'diw:started', nonce });
      }
      await result;
    }

    expect(hosts.map((host) => host.querySelector('iframe'))).toEqual([
      null,
      null,
      null,
      null,
    ]);
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
