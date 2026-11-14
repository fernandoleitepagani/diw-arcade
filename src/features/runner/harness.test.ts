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
});
