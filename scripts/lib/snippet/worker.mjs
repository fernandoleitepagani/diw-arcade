import vm from 'node:vm';
import { parentPort, workerData } from 'node:worker_threads';
import { JSDOM } from 'jsdom';

const SCRIPT_TIMEOUT_MS = 1000;
const MAX_CALLBACKS = 1000;
const MAX_VIRTUAL_MS = 60000;

// jsdom builds its interfaces in the host realm, so a dom snippet can reach
// the host Function constructor through `window.constructor.constructor` and
// the host global through `window._globalObject`. The dom environment is not a
// security boundary: this ban is best-effort, rejects only direct identifier
// forms, and obfuscated access such as
// `window["con"+"structor"]["con"+"structor"](...)` still reaches the worker
// process. Any match refuses to run the snippet at all.
const DOM_BANNED_IDENTIFIERS = [
  { name: 'constructor', pattern: /\bconstructor\b/ },
  { name: '__proto__', pattern: /\b__proto__\b/ },
  { name: 'getPrototypeOf', pattern: /\bgetPrototypeOf\b/ },
  { name: '_globalObject', pattern: /\b_globalObject\b/ },
  { name: '__lookupGetter__', pattern: /\b__lookupGetter__\b/ },
  { name: '__defineGetter__', pattern: /\b__defineGetter__\b/ },
  { name: 'globalThis', pattern: /\bglobalThis\b/ },
  { name: 'process', pattern: /\bprocess\b/ },
  { name: 'require', pattern: /\brequire\b/ },
  { name: 'import(', pattern: /\bimport\s*\(/ },
];

function findBannedDomIdentifier(source) {
  for (const entry of DOM_BANNED_IDENTIFIERS) {
    if (entry.pattern.test(source)) return entry.name;
  }
  return null;
}

function blockedDomResult(identifier) {
  return {
    ok: false,
    reason: 'crash',
    detail:
      'código bloqueado no ambiente dom: o identificador "' +
      identifier +
      '" não é permitido',
  };
}

// A rejected promise in the snippet must not take down the worker; the
// execution model appends nothing for them.
process.on('unhandledRejection', () => {});

/**
 * In `js`, everything the snippet can see is defined inside the sealed target
 * realm by this prelude. In `dom`, jsdom builds its interfaces in the host
 * realm, so the prelude cannot seal the environment. Either way no host object
 * or function is passed into the context directly; mocks arrive later as a
 * JSON string and are parsed in-context.
 */
const PRELUDE = `(function () {
  'use strict';

  var MAX_CALLBACKS = ${MAX_CALLBACKS};
  var MAX_VIRTUAL_MS = ${MAX_VIRTUAL_MS};

  var lines = [];
  var queue = [];
  var sequence = 0;
  var nextId = 1;
  var now = 0;
  var callbacks = 0;
  var limitHit = false;
  var currentTask = null;
  var mocks = {};

  try { delete globalThis.XMLHttpRequest; } catch (error) {}
  try { delete globalThis.WebSocket; } catch (error) {}
  try { delete globalThis.EventSource; } catch (error) {}
  try { delete globalThis.prompt; } catch (error) {}
  try { delete globalThis.confirm; } catch (error) {}

  function isDomNode(value) {
    return value !== null &&
      typeof value === 'object' &&
      typeof value.nodeType === 'number' &&
      typeof value.nodeName === 'string';
  }

  function isPlainObject(value) {
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function isError(value) {
    return value instanceof Error ||
      Object.prototype.toString.call(value) === '[object Error]';
  }

  function format(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') {
      return Object.is(value, -0) ? '-0' : String(value);
    }
    if (typeof value === 'bigint') return String(value) + 'n';
    if (typeof value === 'boolean' ||
        value === null ||
        value === undefined ||
        typeof value === 'symbol') {
      return String(value);
    }
    if (typeof value === 'function') {
      var name = value.name;
      return '[Function: ' + (name ? name : 'anonymous') + ']';
    }
    if (isError(value)) return value.name + ': ' + value.message;
    if (isDomNode(value)) {
      return '<' + String(value.nodeName).toLowerCase() + '>';
    }
    if (Array.isArray(value) || isPlainObject(value)) {
      try {
        var json = JSON.stringify(value);
        return json === undefined ? '[object Object]' : json;
      } catch (error) {
        return '[object Object]';
      }
    }
    return Object.prototype.toString.call(value);
  }

  function pushLine(args) {
    var parts = [];
    for (var index = 0; index < args.length; index += 1) {
      parts.push(format(args[index]));
    }
    lines.push(parts.join(' '));
  }

  globalThis.console = {
    log: function () { pushLine(arguments); },
    info: function () { pushLine(arguments); },
    warn: function () { pushLine(arguments); },
    error: function () { pushLine(arguments); },
  };

  globalThis.alert = function (value) {
    lines.push('alert: ' + String(value));
  };

  globalThis.__diwSetMocks = function (jsonText) {
    mocks = JSON.parse(jsonText);
  };

  globalThis.__diwAppendUncaught = function (name, message) {
    lines.push('Uncaught ' + name + ': ' + message);
  };

  function describeError(value) {
    if (value !== null &&
        typeof value === 'object' &&
        typeof value.name === 'string' &&
        typeof value.message === 'string') {
      return 'Uncaught ' + value.name + ': ' + value.message;
    }
    return 'Uncaught ' + String(value);
  }

  function normalizeDelay(delay) {
    var value = Number(delay);
    if (!isFinite(value) || value < 0) return 0;
    return value;
  }

  function enqueue(fn, delay, args, type, id) {
    sequence += 1;
    var task = {
      id: id,
      due: now + delay,
      sequence: sequence,
      fn: fn,
      args: args,
      type: type,
      delay: delay,
      cleared: false,
    };
    queue.push(task);
    return task;
  }

  globalThis.setTimeout = function (fn, delay) {
    if (typeof fn !== 'function') return 0;
    var args = Array.prototype.slice.call(arguments, 2);
    var id = nextId;
    nextId += 1;
    enqueue(fn, normalizeDelay(delay), args, 'timeout', id);
    return id;
  };

  globalThis.setInterval = function (fn, delay) {
    if (typeof fn !== 'function') return 0;
    var args = Array.prototype.slice.call(arguments, 2);
    var id = nextId;
    nextId += 1;
    enqueue(fn, normalizeDelay(delay), args, 'interval', id);
    return id;
  };

  function clear(id) {
    var numeric = Number(id);
    for (var index = 0; index < queue.length; index += 1) {
      if (queue[index].id === numeric) {
        queue[index].cleared = true;
        queue.splice(index, 1);
        return;
      }
    }
    if (currentTask !== null && currentTask.id === numeric) {
      currentTask.cleared = true;
    }
  }

  globalThis.clearTimeout = clear;
  globalThis.clearInterval = clear;

  function cloneJson(value) {
    try {
      var text = JSON.stringify(value);
      return text === undefined ? undefined : JSON.parse(text);
    } catch (error) {
      return value;
    }
  }

  function textOf(value) {
    if (typeof value === 'string') return value;
    var text = JSON.stringify(value);
    return text === undefined ? String(value) : text;
  }

  function makeResponse(status, body) {
    var payload = cloneJson(body);
    return {
      ok: status >= 200 && status <= 299,
      status: status,
      json: function () { return Promise.resolve(cloneJson(payload)); },
      text: function () { return Promise.resolve(textOf(payload)); },
    };
  }

  globalThis.fetch = function (url) {
    var target = String(url);
    return new Promise(function (resolve, reject) {
      enqueue(function () {
        if (!Object.prototype.hasOwnProperty.call(mocks, target)) {
          reject(new TypeError('Rede bloqueada: ' + target));
          return;
        }
        var mock = mocks[target];
        var status = typeof mock.status === 'number' ? mock.status : 200;
        resolve(makeResponse(status, mock.body));
      }, 0, [], 'fetch', -1);
    });
  };

  globalThis.__diwQueueEvent = function (kind) {
    enqueue(function () {
      if (kind === 'domcontentloaded') {
        document.dispatchEvent(new Event('DOMContentLoaded'));
      } else {
        window.dispatchEvent(new Event('load'));
      }
    }, 0, [], 'event', -1);
  };

  function compareTasks(left, right) {
    return left.due - right.due || left.sequence - right.sequence;
  }

  globalThis.__diwNext = function () {
    if (limitHit) return 'limit';
    if (queue.length === 0) return 'done';

    queue.sort(compareTasks);
    var task = queue.shift();
    now = task.due;

    if (callbacks >= MAX_CALLBACKS || now > MAX_VIRTUAL_MS) {
      limitHit = true;
      return 'limit';
    }

    callbacks += 1;
    currentTask = task;
    try {
      task.fn.apply(undefined, task.args);
    } catch (error) {
      lines.push(describeError(error));
    }
    currentTask = null;

    if (task.type === 'interval' && !task.cleared) {
      enqueue(task.fn, task.delay, task.args, 'interval', task.id);
    }
    return 'ok';
  };

  globalThis.__diwLines = function () {
    return lines;
  };
})();`;

function timeoutResult() {
  return { ok: false, reason: 'timeout', detail: 'tempo limite de execução' };
}

function limitResult() {
  return {
    ok: false,
    reason: 'limit',
    detail: 'limite de callbacks ou de tempo virtual excedido',
  };
}

function crashResult(error) {
  const detail =
    error && typeof error.message === 'string'
      ? error.message
      : String(error);
  return { ok: false, reason: 'crash', detail };
}

function isScriptTimeout(error) {
  return Boolean(error && error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT');
}

function installPrelude(context, mocks) {
  const mocksJson = JSON.stringify(mocks ?? {});
  const source =
    PRELUDE + '\n__diwSetMocks(' + JSON.stringify(mocksJson) + ');';
  new vm.Script(source).runInContext(context, {
    timeout: SCRIPT_TIMEOUT_MS,
  });
}

function appendUncaught(context, error) {
  const name =
    error && typeof error.name === 'string' ? error.name : 'Error';
  const message =
    error && typeof error.message === 'string'
      ? error.message
      : String(error);
  const source =
    '__diwAppendUncaught(' +
    JSON.stringify(name) +
    ', ' +
    JSON.stringify(message) +
    ');';
  new vm.Script(source).runInContext(context, {
    timeout: SCRIPT_TIMEOUT_MS,
  });
}

function readOutput(context) {
  const serialized = new vm.Script('JSON.stringify(__diwLines())').runInContext(
    context,
    { timeout: SCRIPT_TIMEOUT_MS },
  );
  const parsed = JSON.parse(serialized);
  return Array.isArray(parsed) ? parsed.join('\n') : '';
}

function runJs(spec) {
  // A plain `{}` sandbox hands the global a host Object.prototype, so
  // `this.hasOwnProperty.constructor` would reach the host Function and bypass
  // codeGeneration. A null-prototype sandbox keeps the realm intrinsics (and
  // their constructors) inside the context.
  const context = vm.createContext(
    Object.create(null),
    {
      codeGeneration: { strings: false, wasm: false },
      microtaskMode: 'afterEvaluate',
    },
  );

  installPrelude(context, spec.mocks);
  // Defense in depth: pin the global's own `constructor` to the realm's
  // Object, so `this.constructor.constructor` can never reach a host Function.
  new vm.Script(
    'Object.defineProperty(globalThis, "constructor", { value: Object, configurable: false, writable: false });',
  ).runInContext(context, { timeout: SCRIPT_TIMEOUT_MS });

  try {
    new vm.Script(spec.source).runInContext(context, {
      timeout: SCRIPT_TIMEOUT_MS,
    });
  } catch (error) {
    if (isScriptTimeout(error)) return timeoutResult();
    appendUncaught(context, error);
  }

  const next = new vm.Script('__diwNext()');
  for (;;) {
    let status;
    try {
      status = next.runInContext(context, { timeout: SCRIPT_TIMEOUT_MS });
    } catch (error) {
      if (isScriptTimeout(error)) return timeoutResult();
      return crashResult(error);
    }
    if (status === 'done') break;
    if (status === 'limit') return limitResult();
  }

  return { ok: true, output: readOutput(context) };
}

function waitForLoad(dom) {
  if (dom.window.document.readyState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    dom.window.addEventListener('load', () => resolve(), { once: true });
  });
}

function drainMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function runDom(spec) {
  const banned = findBannedDomIdentifier(spec.source);
  if (banned !== null) return blockedDomResult(banned);

  const body = spec.html ?? '';
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body>' + body + '</body></html>',
    {
      runScripts: 'outside-only',
      url: spec.url ?? 'https://exemplo.local/',
    },
  );

  try {
    await waitForLoad(dom);
    const context = dom.getInternalVMContext();
    installPrelude(context, spec.mocks);

    new vm.Script(
      '__diwQueueEvent("domcontentloaded"); __diwQueueEvent("load");',
    ).runInContext(context, { timeout: SCRIPT_TIMEOUT_MS });

    try {
      new vm.Script(spec.source).runInContext(context, {
        timeout: SCRIPT_TIMEOUT_MS,
      });
    } catch (error) {
      if (isScriptTimeout(error)) return timeoutResult();
      appendUncaught(context, error);
    }

    await drainMicrotasks();

    const next = new vm.Script('__diwNext()');
    for (;;) {
      let status;
      try {
        status = next.runInContext(context, { timeout: SCRIPT_TIMEOUT_MS });
      } catch (error) {
        if (isScriptTimeout(error)) return timeoutResult();
        return crashResult(error);
      }
      if (status === 'done') break;
      if (status === 'limit') return limitResult();
      await drainMicrotasks();
    }

    return { ok: true, output: readOutput(context) };
  } finally {
    dom.window.close();
  }
}

async function run(spec) {
  try {
    return spec.env === 'dom' ? await runDom(spec) : runJs(spec);
  } catch (error) {
    return crashResult(error);
  }
}

parentPort.on('message', (spec) => {
  void run(spec).then((result) => parentPort.postMessage(result));
});

// Startup is reported separately from execution so the runner can bill module
// loading to a generous startup budget instead of the snippet watchdog.
const startupDelayMs =
  typeof workerData?.startupDelayMs === 'number' ? workerData.startupDelayMs : 0;
if (startupDelayMs > 0) {
  await new Promise((resolve) => setTimeout(resolve, startupDelayMs));
}
parentPort.postMessage({ type: 'ready' });
