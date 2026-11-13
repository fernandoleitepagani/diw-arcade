import { afterAll, describe, expect, it } from 'vitest';
import {
  createSnippetRunner,
  type SnippetResult,
  type SnippetRunner,
  type SnippetSpec,
} from './runSnippet';

const runner: SnippetRunner = createSnippetRunner();

afterAll(async () => {
  await runner.close();
});

function outputOf(result: SnippetResult): string {
  if (!result.ok) {
    throw new Error(`execução falhou: ${result.reason} (${result.detail})`);
  }
  return result.output;
}

async function run(spec: SnippetSpec): Promise<string> {
  return outputOf(await runner.run(spec));
}

function runJs(source: string): Promise<string> {
  return run({ env: 'js', source });
}

describe('console', () => {
  it('imprime um argumento por linha e junta os demais com espaço', async () => {
    await expect(
      runJs("console.log(1); console.log('a', true)"),
    ).resolves.toBe('1\na true');
  });

  it('formata valores como o console do navegador', async () => {
    const output = await runJs(
      [
        'console.log(-0);',
        'console.log([1, 2]);',
        'console.log({ a: 1 });',
        'function f() {}',
        'console.log(f);',
        'console.log(Promise.resolve());',
        "console.log(new Error('falhou'));",
      ].join('\n'),
    );

    expect(output).toBe(
      '-0\n[1,2]\n{"a":1}\n[Function: f]\n[object Promise]\nError: falhou',
    );
  });

  it('registra alert', async () => {
    await expect(runJs("alert('Oi'); alert(42);")).resolves.toBe(
      'alert: Oi\nalert: 42',
    );
  });
});

describe('event loop', () => {
  it('drena microtasks antes da próxima macrotask', async () => {
    const output = await runJs(
      [
        "console.log('A');",
        "setTimeout(() => console.log('B'), 0);",
        "Promise.resolve().then(() => console.log('C'));",
      ].join('\n'),
    );

    expect(output).toBe('A\nC\nB');
  });

  it('executa timers na ordem do vencimento', async () => {
    const output = await runJs(
      [
        'setTimeout(() => console.log(20), 20);',
        'setTimeout(() => console.log(10), 10);',
        'setTimeout(() => console.log(0), 0);',
      ].join('\n'),
    );

    expect(output).toBe('0\n10\n20');
  });

  it('mantém this do callback de timer', async () => {
    const output = await runJs(
      "setTimeout(function () { console.log(typeof this); }, 0);",
    );

    expect(output).toBe('object');
  });
});

describe('escopo e hoisting', () => {
  it('mostra undefined para var antes da atribuição', async () => {
    await expect(
      runJs('console.log(x); var x = 1;'),
    ).resolves.toBe('undefined');
  });

  it('mantém a TDZ de let', async () => {
    await expect(runJs('console.log(y); let y = 1;')).resolves.toBe(
      "Uncaught ReferenceError: Cannot access 'y' before initialization",
    );
  });

  it('distingue var de let no laço com setTimeout', async () => {
    const output = await runJs(
      [
        'for (var i = 0; i < 3; i += 1) { setTimeout(() => console.log(i), 0); }',
        'for (let j = 0; j < 3; j += 1) { setTimeout(() => console.log(j), 0); }',
      ].join('\n'),
    );

    expect(output).toBe('3\n3\n3\n0\n1\n2');
  });

  it('continua a execução depois de um erro no topo', async () => {
    const output = await runJs(
      [
        "setTimeout(() => console.log('depois'), 0);",
        "throw new Error('parou');",
        "console.log('nunca');",
      ].join('\n'),
    );

    expect(output).toBe('Uncaught Error: parou\ndepois');
  });
});

describe('async', () => {
  it('executa a continuação de uma função async como microtask', async () => {
    const output = await runJs(
      [
        'async function obra() { await Promise.resolve(); console.log(2); }',
        'console.log(1);',
        'obra();',
        'console.log(3);',
      ].join('\n'),
    );

    expect(output).toBe('1\n3\n2');
  });
});

describe('fetch', () => {
  it('resolve fetch mockado e entrega o json', async () => {
    const output = await run({
      env: 'js',
      source:
        "fetch('https://api.exemplo/dados').then((r) => r.json()).then((d) => console.log(d.valor));",
      mocks: {
        'https://api.exemplo/dados': { status: 200, body: { valor: 7 } },
      },
    });

    expect(output).toBe('7');
  });

  it('expõe ok falso e status em resposta 404', async () => {
    const output = await run({
      env: 'js',
      source:
        "fetch('https://api.exemplo/nao-existe').then((r) => console.log(r.ok, r.status));",
      mocks: {
        'https://api.exemplo/nao-existe': { status: 404, body: { erro: 'x' } },
      },
    });

    expect(output).toBe('false 404');
  });

  it('bloqueia URL sem mock com TypeError', async () => {
    const output = await runJs(
      "fetch('http://x/y').catch((e) => console.log(e.name + ': ' + e.message));",
    );

    expect(output).toBe('TypeError: Rede bloqueada: http://x/y');
  });

  it('executa um timer de 0 ms agendado antes do fetch', async () => {
    const output = await runJs(
      [
        "setTimeout(() => console.log('timer'), 0);",
        "fetch('http://x/y').catch(() => console.log('fetch'));",
      ].join('\n'),
    );

    expect(output).toBe('timer\nfetch');
  });
});

describe('ambiente js', () => {
  it('não expõe process nem require', async () => {
    await expect(
      runJs("console.log(typeof process + ' ' + typeof require);"),
    ).resolves.toBe('undefined undefined');
  });

  it('bloqueia geração de código a partir de strings', async () => {
    const result = await runner.run({
      env: 'js',
      source: "this.constructor.constructor('return 1')()",
    });

    expect(outputOf(result).split('\n')[0]).toMatch(/^Uncaught EvalError/);
  });

  it('não imprime nada para promise rejeitada sem handler', async () => {
    await expect(
      runJs("Promise.reject(new Error('x')); console.log('fim');"),
    ).resolves.toBe('fim');
  });

  it('bloqueia fuga por hasOwnProperty, toString e __lookupGetter__', async () => {
    const targets = [
      'this.hasOwnProperty.constructor',
      'this.toString.constructor',
      'this.__lookupGetter__.constructor',
    ];

    for (const target of targets) {
      const output = await runJs(`console.log(${target}('return 1')());`);

      expect(output.split('\n')[0]).toMatch(/^Uncaught EvalError/);
      expect(output).not.toBe('1');
    }
  });

  it('não alcança o process real pela fuga', async () => {
    const output = await runJs(
      `console.log(typeof this.hasOwnProperty.constructor("return this['pro'+'cess']")());`,
    );

    expect(output.split('\n')[0]).toMatch(/^Uncaught EvalError/);
    expect(output).not.toMatch(/^object$/m);
  });
});

describe('ambiente dom', () => {
  it('dispara DOMContentLoaded, load e escuta clique', async () => {
    const output = await run({
      env: 'dom',
      html: '<button id="comprar">Comprar</button>',
      source: [
        "const botao = document.getElementById('comprar');",
        "botao.addEventListener('click', () => console.log('clique'));",
        "document.addEventListener('DOMContentLoaded', () => {",
        "  console.log('dom');",
        '  botao.click();',
        '});',
        "window.addEventListener('load', () => console.log('load'));",
        "console.log('sincrono');",
      ].join('\n'),
    });

    expect(output).toBe('sincrono\ndom\nclique\nload');
  });

  it('expõe url e URLSearchParams', async () => {
    const output = await run({
      env: 'dom',
      url: 'https://loja.exemplo/produto.html?id=7&cor=azul',
      source: "console.log(new URLSearchParams(location.search).get('id'));",
    });

    expect(output).toBe('7');
  });

  it('formata nó do DOM como <p>', async () => {
    const output = await run({
      env: 'dom',
      html: '<p id="alvo">Oi</p>',
      source: "console.log(document.getElementById('alvo'));",
    });

    expect(output).toBe('<p>');
  });

  it('remove XMLHttpRequest', async () => {
    const output = await run({
      env: 'dom',
      source: 'console.log(typeof XMLHttpRequest);',
    });

    expect(output).toBe('undefined');
  });

  it('usa o agendador virtual de setTimeout', async () => {
    const output = await run({
      env: 'dom',
      source: [
        "console.log('A');",
        "setTimeout(() => console.log('B'), 0);",
        "Promise.resolve().then(() => console.log('C'));",
      ].join('\n'),
    });

    expect(output).toBe('A\nC\nB');
  });

  it('rejeita fuga por constructor antes de executar', async () => {
    const result = await runner.run({
      env: 'dom',
      source: 'window.constructor.constructor("return 1")()',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('crash');
      expect(result.detail).toContain('"constructor"');
      expect(result.detail).toContain('bloqueado');
    }
  });

  it('rejeita _globalObject antes de executar', async () => {
    const result = await runner.run({
      env: 'dom',
      source: 'console.log(window._globalObject);',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('crash');
      expect(result.detail).toContain('"_globalObject"');
      expect(result.detail).toContain('bloqueado');
    }
  });
});

describe('limites', () => {
  it('corta um loop síncrono e continua utilizável', async () => {
    const started = Date.now();
    const result = await runner.run({ env: 'js', source: 'while (true) {}' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(3000);
    await expect(runJs("console.log('depois');")).resolves.toBe('depois');
  });

  it('corta um loop de microtasks e continua utilizável', async () => {
    const started = Date.now();
    const result = await runner.run({
      env: 'js',
      source:
        'function proxima() { Promise.resolve().then(proxima); } Promise.resolve().then(proxima);',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(3000);
    await expect(runJs("console.log('depois');")).resolves.toBe('depois');
  });

  it('corta um loop de microtasks no dom pelo relógio de parede', async () => {
    const started = Date.now();
    const result = await runner.run({
      env: 'dom',
      source:
        'function proxima() { Promise.resolve().then(proxima); } Promise.resolve().then(proxima);',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('limita setInterval infinito', async () => {
    const result = await runner.run({
      env: 'js',
      source: "setInterval(() => console.log('tick'), 0);",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('limit');
  });
});

describe('inicialização do worker', () => {
  it('não cobra a inicialização lenta do executor do tempo de execução', async () => {
    const slow = createSnippetRunner({ startupDelayMs: 3000, timeoutMs: 500 });
    try {
      await expect(
        slow.run({ env: 'js', source: "console.log('ok')" }),
      ).resolves.toEqual({ ok: true, output: 'ok' });
    } finally {
      await slow.close();
    }
  }, 15000);

  it('reporta um erro de inicialização distinto quando o worker não fica pronto', async () => {
    const slow = createSnippetRunner({
      startupTimeoutMs: 100,
      startupDelayMs: 2000,
    });
    try {
      const result = await slow.run({ env: 'js', source: "console.log('ok')" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('timeout');
        expect(result.detail).toContain('inicialização');
      }
    } finally {
      await slow.close();
    }
  });
});

describe('determinismo', () => {
  it('produz a mesma saída ao rodar a mesma spec duas vezes', async () => {
    const spec: SnippetSpec = {
      env: 'js',
      source: "console.log('x'); setTimeout(() => console.log('y'), 5);",
    };

    const first = await runner.run(spec);
    const second = await runner.run(spec);

    expect(first).toEqual(second);
  });
});
