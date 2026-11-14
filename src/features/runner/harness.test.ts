import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type {
  Action,
  Check,
  JsonValue,
  Requirement,
} from '../../content/schema';
import {
  RunnerMessageSchema,
  type ReadyMessage,
  type ResultMessage,
} from './messages';
import { buildSrcdoc } from './srcdoc';

const ORIGIN = 'https://diw-arcade.local/';
const harnessSource = readFileSync(
  join(process.cwd(), 'src/features/runner/harness.js'),
  'utf8',
);

interface HarnessOptions {
  html?: string;
  css?: string;
  js?: string;
  requirements?: Requirement[];
  mocks?: Record<string, JsonValue>;
  mode?: 'preview' | 'test';
}

function requirement(
  id: string,
  check: Check,
  before?: Action[],
): Requirement {
  return { id, label: id, check, ...(before ? { before } : {}) };
}

async function runHarness(
  options: HarnessOptions = {},
): Promise<ReadyMessage | ResultMessage> {
  const nonce = `teste-${Math.random().toString(36).slice(2)}`;
  const srcdoc = buildSrcdoc(
    {
      html: options.html ?? '',
      css: options.css ?? '',
      js: options.js ?? '',
    },
    {
      nonce,
      mode: options.mode ?? 'test',
      parentOrigin: ORIGIN,
      requirements: options.requirements ?? [],
      mocks: options.mocks,
    },
    harnessSource,
  );
  const dom = new JSDOM(srcdoc, {
    runScripts: 'dangerously',
    url: ORIGIN,
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      dom.window.close();
      reject(new Error('o harness não respondeu'));
    }, 2000);

    dom.window.addEventListener('message', (event) => {
      const parsed = RunnerMessageSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.nonce !== nonce) {
        return;
      }
      // Lifecycle signals are not the answer; keep waiting for it.
      if (parsed.data.type === 'diw:started' || parsed.data.type === 'diw:unload') {
        return;
      }
      clearTimeout(timer);
      dom.window.close();
      resolve(parsed.data);
    });
  });
}

async function runTest(options: HarnessOptions = {}): Promise<ResultMessage> {
  const message = await runHarness(options);
  if (message.type !== 'diw:result') {
    throw new Error('esperava uma mensagem diw:result');
  }
  return message;
}

describe('harness checks', () => {
  it('passes and fails exists', async () => {
    const message = await runTest({
      html: '<div class="alvo"></div>',
      requirements: [
        requirement('existe', { kind: 'exists', selector: '.alvo' }),
        requirement('ausente', { kind: 'exists', selector: '.ausente' }),
      ],
    });

    expect(message.requirements[0]?.passed).toBe(true);
    expect(message.requirements[1]?.passed).toBe(false);
  });

  it('passes and fails count within bounds', async () => {
    const message = await runTest({
      html: '<ul><li>a</li><li>b</li></ul>',
      requirements: [
        requirement('intervalo', {
          kind: 'count',
          selector: 'li',
          min: 2,
          max: 2,
        }),
        requirement('minimo', { kind: 'count', selector: 'li', min: 3 }),
        requirement('maximo', { kind: 'count', selector: 'li', min: 0, max: 1 }),
      ],
    });

    expect(message.requirements[0]?.passed).toBe(true);
    expect(message.requirements[1]?.passed).toBe(false);
    expect(message.requirements[2]?.passed).toBe(false);
  });

  it('passes and fails attr existence and matchers', async () => {
    const message = await runTest({
      html: '<input id="campo" required data-x="A">',
      requirements: [
        requirement('presente', {
          kind: 'attr',
          selector: '#campo',
          name: 'required',
        }),
        requirement('igual', {
          kind: 'attr',
          selector: '#campo',
          name: 'data-x',
          match: { equals: 'a' },
        }),
        requirement('diferente', {
          kind: 'attr',
          selector: '#campo',
          name: 'data-x',
          match: { equals: 'b' },
        }),
        requirement('ausente', {
          kind: 'attr',
          selector: '#campo',
          name: 'data-y',
        }),
      ],
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('passes and fails text with normalized whitespace', async () => {
    const message = await runTest({
      html: '<p id="texto">  Olá,   Mundo  </p>',
      requirements: [
        requirement('igual', {
          kind: 'text',
          selector: '#texto',
          match: { equals: 'olá, mundo' },
        }),
        requirement('padrao', {
          kind: 'text',
          selector: '#texto',
          match: { pattern: 'mundo' },
        }),
        requirement('diferente', {
          kind: 'text',
          selector: '#texto',
          match: { equals: 'tchau' },
        }),
      ],
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('reads declared styles: inline wins, the last top-level rule wins', async () => {
    const css = [
      '#alvo { color: red; }',
      '.caixa { color: blue; }',
      '.caixa { background-color: #0A1128; }',
      '@media (min-width: 1px) { .caixa { color: purple; } }',
    ].join('\n');

    const message = await runTest({
      html: [
        '<div id="alvo" class="caixa" style="color: green"></div>',
        '<div id="sem-inline" class="caixa"></div>',
      ].join(''),
      css,
      requirements: [
        requirement('inline', {
          kind: 'style',
          selector: '#alvo',
          prop: 'color',
          match: { equals: 'green' },
        }),
        requirement('ultima', {
          kind: 'style',
          selector: '#sem-inline',
          prop: 'color',
          match: { equals: 'blue' },
        }),
        requirement('fundo', {
          kind: 'style',
          selector: '#sem-inline',
          prop: 'background-color',
          match: { pattern: '#0a1128' },
        }),
      ],
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('ignores @media for style checks and fails a missing property', async () => {
    const message = await runTest({
      html: '<div class="caixa"></div>',
      css: '.caixa { color: blue; } @media (min-width: 1px) { .caixa { color: purple; } }',
      requirements: [
        requirement('ignora-media', {
          kind: 'style',
          selector: '.caixa',
          prop: 'color',
          match: { equals: 'purple' },
        }),
        requirement('ausente', {
          kind: 'style',
          selector: '.caixa',
          prop: 'margin',
          match: { equals: '0' },
        }),
      ],
    });

    expect(message.requirements[0]?.passed).toBe(false);
    expect(message.requirements[1]?.passed).toBe(false);
  });

  it('passes and fails media checks', async () => {
    const css =
      '@media (min-width: 600px) { .caixa { display: none; } }';
    const requirements: Requirement[] = [
      requirement('aprovado', {
        kind: 'media',
        condition: 'min-width:\\s*600px',
        selector: '.caixa',
        prop: 'display',
        match: { equals: 'none' },
      }),
      requirement('condicao', {
        kind: 'media',
        condition: 'max-width',
        selector: '.caixa',
        prop: 'display',
        match: { equals: 'none' },
      }),
      requirement('seletor', {
        kind: 'media',
        condition: 'min-width',
        selector: '.outro',
        prop: 'display',
        match: { equals: 'none' },
      }),
      requirement('valor', {
        kind: 'media',
        condition: 'min-width',
        selector: '.caixa',
        prop: 'display',
        match: { equals: 'block' },
      }),
    ];

    const message = await runTest({
      html: '<div class="caixa"></div>',
      css,
      requirements,
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('passes noErrors and reports captured errors', async () => {
    const clean = await runTest({ requirements: [requirement('limpo', { kind: 'noErrors' })] });
    expect(clean.requirements[0]?.passed).toBe(true);
    expect(clean.errors).toEqual([]);

    const broken = await runTest({
      js: 'throw new Error("falha proposital");',
      requirements: [requirement('quebrado', { kind: 'noErrors' })],
    });
    expect(broken.requirements[0]?.passed).toBe(false);
    expect(broken.errors).toContain('falha proposital');
  });

  it('runs click, input and wait actions in order', async () => {
    const message = await runTest({
      html: [
        '<button id="botao">Abrir</button>',
        '<input id="campo">',
        '<p id="saida"></p>',
        '<div id="tardio"></div>',
      ].join(''),
      js: [
        'document.querySelector("#botao").addEventListener("click", function () {',
        '  document.querySelector("#tardio").classList.add("pronto");',
        '});',
        'document.querySelector("#campo").addEventListener("input", function (event) {',
        '  document.querySelector("#saida").textContent = event.target.value;',
        '});',
        'setTimeout(function () {',
        '  document.querySelector("#tardio").setAttribute("data-pronto", "sim");',
        '}, 30);',
      ].join('\n'),
      requirements: [
        requirement(
          'click',
          { kind: 'exists', selector: '#tardio.pronto' },
          [{ do: 'click', selector: '#botao' }],
        ),
        requirement(
          'input',
          { kind: 'text', selector: '#saida', match: { equals: 'oi' } },
          [{ do: 'input', selector: '#campo', value: 'Oi' }],
        ),
        requirement(
          'wait',
          {
            kind: 'attr',
            selector: '#tardio',
            name: 'data-pronto',
            match: { equals: 'sim' },
          },
          [{ do: 'wait', ms: 60 }],
        ),
      ],
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('resolves mocked fetch URLs and blocks every other URL', async () => {
    const message = await runTest({
      mocks: { '/api/dados': { valor: 7 } },
      js: [
        'fetch("/api/dados").then(function (response) { return response.json(); })',
        '  .then(function (data) { document.body.dataset.valor = String(data.valor); });',
        'fetch("https://exemplo.test/fora").catch(function (error) {',
        '  document.body.dataset.erro = error.name + ":" + error.message;',
        '});',
      ].join('\n'),
      requirements: [
        requirement('mock', {
          kind: 'attr',
          selector: 'body',
          name: 'data-valor',
          match: { equals: '7' },
        }),
        requirement('bloqueado', {
          kind: 'attr',
          selector: 'body',
          name: 'data-erro',
          match: { pattern: 'rede bloqueada no diw arcade' },
        }),
      ],
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([
      true,
      true,
    ]);
  });

  it('posts diw:ready in preview mode', async () => {
    const message = await runHarness({ html: '<p>oi</p>', mode: 'preview' });

    expect(message.type).toBe('diw:ready');
    expect(message.errors).toEqual([]);
  });

  it('runs a submit handler that sees the event already cancelled', async () => {
    const message = await runTest({
      html: '<form id="f"><button id="go">ok</button></form>',
      js: [
        "document.getElementById('f').addEventListener('submit', function (e) {",
        "  document.body.setAttribute('data-prevented', String(e.defaultPrevented));",
        '});',
      ].join('\n'),
      requirements: [
        requirement(
          'cancelado',
          {
            kind: 'attr',
            selector: 'body',
            name: 'data-prevented',
            match: { equals: 'true' },
          },
          [{ do: 'click', selector: '#go' }],
        ),
      ],
    });

    expect(message.type).toBe('diw:result');
    expect(message.requirements.map((result) => result.passed)).toEqual([true]);
  });

  it('turns form.submit() into a no-op so the frame cannot reload', async () => {
    const message = await runTest({
      html: '<form id="f"></form>',
      js: [
        "document.getElementById('f').submit();",
        "document.body.setAttribute('data-depois', 'sim');",
      ].join('\n'),
      requirements: [
        requirement('seguiu', {
          kind: 'attr',
          selector: 'body',
          name: 'data-depois',
          match: { equals: 'sim' },
        }),
      ],
    });

    expect(message.requirements.map((result) => result.passed)).toEqual([true]);
    expect(message.errors).toEqual([]);
  });

  // v4: submit is not composed, so the window guard never sees a shadow-root form.
  it.each(['open', 'closed'] as const)(
    'cancels the submit of a form inside a %s shadow root',
    async (mode) => {
      const message = await runTest({
        html: '<div id="host"></div>',
        js: [
          "var root = document.getElementById('host').attachShadow({ mode: '" + mode + "' });",
          "root.innerHTML = '<form id=\"f\"><button id=\"go\">ok</button></form>';",
          "root.getElementById('f').addEventListener('submit', function (e) {",
          "  document.body.setAttribute('data-prevented', String(e.defaultPrevented));",
          '});',
          "var btn = root.getElementById('go');",
          "document.getElementById('host').addEventListener('click', function () { btn.click(); });",
        ].join('\n'),
        requirements: [
          requirement(
            'cancelado',
            {
              kind: 'attr',
              selector: 'body',
              name: 'data-prevented',
              match: { equals: 'true' },
            },
            [{ do: 'click', selector: '#host' }],
          ),
        ],
      });

      expect(message.requirements.map((result) => result.passed)).toEqual([true]);
    },
  );

  describe('lifecycle', () => {
    async function collect(options: HarnessOptions): Promise<string[]> {
      const nonce = 'ciclo-vida';
      const srcdoc = buildSrcdoc(
        { html: options.html ?? '', css: '', js: options.js ?? '' },
        {
          nonce,
          mode: options.mode ?? 'test',
          parentOrigin: ORIGIN,
          requirements: options.requirements ?? [],
        },
        harnessSource,
      );
      const dom = new JSDOM(srcdoc, {
        runScripts: 'dangerously',
        url: ORIGIN,
        pretendToBeVisual: true,
        virtualConsole: new VirtualConsole(),
      });
      const seen: string[] = [];
      dom.window.addEventListener('message', (event) => {
        const parsed = RunnerMessageSchema.safeParse(event.data);
        if (parsed.success && parsed.data.nonce === nonce) {
          seen.push(parsed.data.type);
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
      dom.window.close();
      return seen;
    }

    // v4: AC8(a) diw:started is posted before student code runs, both modes.
    it.each(['test', 'preview'] as const)(
      'posts diw:started before the student script in %s mode',
      async (mode) => {
        const seen = await collect({
          mode,
          js: "window.parent.postMessage({ type: 'diw:unload', nonce: 'ciclo-vida' }, '*');",
          requirements: [requirement('r', { kind: 'exists', selector: 'body' })],
        });

        expect(seen.slice(0, 2)).toEqual(['diw:started', 'diw:unload']);
        expect(seen).toContain(mode === 'test' ? 'diw:result' : 'diw:ready');
      },
    );

    // v4: AC4 beforeunload is provisional; the harness reports that it survived.
    it('posts diw:survived after a beforeunload the document outlives', async () => {
      const nonce = 'ciclo-vida';
      const srcdoc = buildSrcdoc(
        { html: '', css: '', js: '' },
        { nonce, mode: 'preview', parentOrigin: ORIGIN, requirements: [] },
        harnessSource,
      );
      const dom = new JSDOM(srcdoc, {
        runScripts: 'dangerously',
        url: ORIGIN,
        pretendToBeVisual: true,
        virtualConsole: new VirtualConsole(),
      });
      const seen: string[] = [];
      dom.window.addEventListener('message', (event) => {
        const parsed = RunnerMessageSchema.safeParse(event.data);
        if (parsed.success && parsed.data.nonce === nonce) {
          seen.push(parsed.data.type);
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      seen.length = 0;
      dom.window.dispatchEvent(new dom.window.Event('beforeunload'));
      await new Promise((resolve) => setTimeout(resolve, 300));
      dom.window.close();

      expect(seen).toEqual(['diw:unload', 'diw:survived']);
    });

    it('does not post diw:survived once pagehide has fired', async () => {
      const nonce = 'ciclo-vida';
      const srcdoc = buildSrcdoc(
        { html: '', css: '', js: '' },
        { nonce, mode: 'preview', parentOrigin: ORIGIN, requirements: [] },
        harnessSource,
      );
      const dom = new JSDOM(srcdoc, {
        runScripts: 'dangerously',
        url: ORIGIN,
        pretendToBeVisual: true,
        virtualConsole: new VirtualConsole(),
      });
      const seen: string[] = [];
      dom.window.addEventListener('message', (event) => {
        const parsed = RunnerMessageSchema.safeParse(event.data);
        if (parsed.success && parsed.data.nonce === nonce) {
          seen.push(parsed.data.type);
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      seen.length = 0;
      dom.window.dispatchEvent(new dom.window.Event('beforeunload'));
      dom.window.dispatchEvent(new dom.window.Event('pagehide'));
      await new Promise((resolve) => setTimeout(resolve, 300));
      dom.window.close();

      expect(seen).not.toContain('diw:survived');
      expect(seen).toContain('diw:unload');
    });

    it('posts diw:started synchronously, even when student code throws', async () => {
      const seen = await collect({ js: 'throw new Error("boom");' });

      expect(seen[0]).toBe('diw:started');
    });
  });

  it('still posts diw:result when something throws outside the per-requirement try/catch', async () => {
    const message = await runTest({
      html: '<p id="a"></p>',
      js: [
        'var hostile = { get message() { throw new Error("getter"); } };',
        'var reads = 0;',
        'Object.defineProperty(window.__DIW__.requirements[0], "id", {',
        '  get: function () {',
        '    reads += 1;',
        '    if (reads === 1) { throw hostile; }',
        '    return "um";',
        '  },',
        '});',
      ].join('\n'),
      requirements: [
        requirement('um', { kind: 'exists', selector: '#a' }),
        requirement('dois', { kind: 'exists', selector: '#a' }),
      ],
    });

    expect(message.type).toBe('diw:result');
    expect(message.requirements).toEqual([
      { id: 'um', passed: false, message: 'Erro interno ao avaliar os requisitos.' },
      { id: 'dois', passed: false, message: 'Erro interno ao avaliar os requisitos.' },
    ]);
    expect(message.errors).toEqual(['Erro desconhecido']);
  });
});
