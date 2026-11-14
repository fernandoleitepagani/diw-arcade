/* Runs inside the sandboxed iframe. Plain ES2020, no imports. */
(function () {
  'use strict';

  var config = window.__DIW__ || {};
  var nonce = config.nonce || '';
  var errors = [];

  /*
   * First listener on window, in capture phase: it runs before any student
   * handler. preventDefault cancels the navigation of a submitted form; it
   * does not stop propagation, so student handlers still run.
   */
  window.addEventListener(
    'submit',
    function (event) {
      event.preventDefault();
    },
    true,
  );

  /*
   * form.submit() fires no submit event, so the guard never sees it. In
   * Chromium it reloads a sandboxed srcdoc frame even with CSP form-action
   * 'none'. Make it a no-op, like the guard does for a clicked submit button.
   */
  HTMLFormElement.prototype.submit = function () {};

  /*
   * `submit` is not composed: a form inside a shadow root never reaches the
   * window listener. Give every new shadow root (open or closed; attachShadow
   * returns both) the same capture-phase guard. Declarative shadow DOM
   * (<template shadowrootmode>) is created by the parser, not by this call,
   * and stays unguarded (ADR-0001).
   */
  var nativeAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    var root = nativeAttachShadow.call(this, init);
    root.addEventListener(
      'submit',
      function (event) {
        event.preventDefault();
      },
      true,
    );
    return root;
  };

  /** Total: a hostile error object must not break the reporting path. */
  function describeError(value) {
    try {
      if (value && typeof value.message === 'string') {
        return value.message;
      }
      return String(value);
    } catch {
      return 'Erro desconhecido';
    }
  }

  window.addEventListener('error', function (event) {
    var message = event.message || (event.error && event.error.message);
    if (message) {
      errors.push(String(message));
    }
  });

  window.addEventListener('unhandledrejection', function (event) {
    var message = event.reason && event.reason.message
      ? event.reason.message
      : event.reason;
    if (message) {
      errors.push(String(message));
    }
  });

  function normalize(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/,\s+/g, ',');
  }

  function normalizeSelector(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function hexPair(value) {
    var text = Number(value).toString(16);
    return text.length === 1 ? '0' + text : text;
  }

  /**
   * CSSOM serializes colours as `rgb()`/`rgba()` even when the author wrote a
   * hex value, so the other spelling is accepted as a candidate.
   */
  function colourAliases(value) {
    var aliases = [];
    var rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+%?)?\s*\)$/.exec(
      value,
    );
    if (rgb) {
      aliases.push('#' + hexPair(rgb[1]) + hexPair(rgb[2]) + hexPair(rgb[3]));
      return aliases;
    }

    var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
    if (hex) {
      var digits = hex[1];
      if (digits.length === 3) {
        digits = digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2];
      }
      aliases.push(
        'rgb(' +
          parseInt(digits.slice(0, 2), 16) +
          ',' +
          parseInt(digits.slice(2, 4), 16) +
          ',' +
          parseInt(digits.slice(4, 6), 16) +
          ')',
      );
    }
    return aliases;
  }

  function matches(actual, matcher) {
    if (!matcher) {
      return false;
    }
    var value = normalize(actual);
    var candidates = [value].concat(colourAliases(value));

    function equalsCandidate(expected) {
      return candidates.indexOf(normalize(expected)) !== -1;
    }

    if (typeof matcher.equals === 'string') {
      return equalsCandidate(matcher.equals);
    }
    if (Array.isArray(matcher.oneOf)) {
      return matcher.oneOf.some(equalsCandidate);
    }
    if (typeof matcher.pattern === 'string') {
      try {
        var pattern = new RegExp(matcher.pattern, 'i');
        return candidates.some(function (candidate) {
          return pattern.test(candidate);
        });
      } catch {
        return false;
      }
    }
    return false;
  }

  function eachStyleSheet(callback) {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i += 1) {
      var rules;
      try {
        rules = sheets[i].cssRules;
      } catch {
        continue;
      }
      callback(rules);
    }
  }

  /** Declared value: inline wins, then the last matching top-level rule. */
  function declaredStyle(element, prop) {
    var inline = element.style && element.style.getPropertyValue(prop);
    if (inline) {
      return inline;
    }

    var value = '';
    eachStyleSheet(function (rules) {
      for (var i = 0; i < rules.length; i += 1) {
        var rule = rules[i];
        if (rule.type !== 1 || typeof rule.selectorText !== 'string') {
          continue;
        }
        try {
          if (!element.matches(rule.selectorText)) {
            continue;
          }
        } catch {
          continue;
        }
        var declared = rule.style && rule.style.getPropertyValue(prop);
        if (declared) {
          value = declared;
        }
      }
    });
    return value;
  }

  /**
   * Media value: a @media whose conditionText matches the condition regex,
   * with a rule whose normalized selector matches exactly.
   */
  function mediaValue(selector, condition, prop) {
    var wanted = normalizeSelector(selector);
    var conditionRegExp;
    try {
      conditionRegExp = new RegExp(condition, 'i');
    } catch {
      return '';
    }

    var value = '';
    eachStyleSheet(function (rules) {
      for (var i = 0; i < rules.length; i += 1) {
        var rule = rules[i];
        if (rule.type !== 4) {
          continue;
        }
        if (!conditionRegExp.test(rule.conditionText || '')) {
          continue;
        }
        var nested = rule.cssRules || [];
        for (var j = 0; j < nested.length; j += 1) {
          var inner = nested[j];
          if (inner.type !== 1 || typeof inner.selectorText !== 'string') {
            continue;
          }
          if (normalizeSelector(inner.selectorText) !== wanted) {
            continue;
          }
          var declared = inner.style && inner.style.getPropertyValue(prop);
          if (declared) {
            value = declared;
          }
        }
      }
    });
    return value;
  }

  function fail(message) {
    return { passed: false, message: message };
  }

  function evaluate(check) {
    var element;
    try {
      switch (check.kind) {
        case 'exists':
          return document.querySelector(check.selector)
            ? { passed: true }
            : fail('Elemento não encontrado: ' + check.selector);
        case 'count': {
          var count = document.querySelectorAll(check.selector).length;
          var max = typeof check.max === 'number' ? check.max : Infinity;
          return count >= check.min && count <= max
            ? { passed: true }
            : fail(
                'Esperado entre ' +
                  check.min +
                  ' e ' +
                  (max === Infinity ? '∞' : max) +
                  ' elementos, encontrados ' +
                  count,
              );
        }
        case 'attr':
          element = document.querySelector(check.selector);
          if (!element) {
            return fail('Elemento não encontrado: ' + check.selector);
          }
          if (!element.hasAttribute(check.name)) {
            return fail('Atributo "' + check.name + '" ausente');
          }
          if (check.match && !matches(element.getAttribute(check.name), check.match)) {
            return fail('Atributo "' + check.name + '" não confere');
          }
          return { passed: true };
        case 'text':
          element = document.querySelector(check.selector);
          if (!element) {
            return fail('Elemento não encontrado: ' + check.selector);
          }
          return matches(element.textContent, check.match)
            ? { passed: true }
            : fail('Texto de ' + check.selector + ' não confere');
        case 'style':
          element = document.querySelector(check.selector);
          if (!element) {
            return fail('Elemento não encontrado: ' + check.selector);
          }
          var style = declaredStyle(element, check.prop);
          if (!style) {
            return fail('Propriedade "' + check.prop + '" ausente');
          }
          return matches(style, check.match)
            ? { passed: true }
            : fail('Propriedade "' + check.prop + '" não confere');
        case 'media': {
          var media = mediaValue(check.selector, check.condition, check.prop);
          if (!media) {
            return fail(
              'Condição de mídia sem a propriedade "' + check.prop + '"',
            );
          }
          return matches(media, check.match)
            ? { passed: true }
            : fail('Propriedade "' + check.prop + '" não confere na mídia');
        }
        case 'noErrors':
          return errors.length === 0
            ? { passed: true }
            : fail('Erros detectados: ' + errors.join('; '));
        default:
          return fail('Verificação desconhecida');
      }
    } catch (error) {
      return fail(describeError(error));
    }
  }

  function requestUrl(input) {
    if (typeof input === 'string') {
      return input;
    }
    if (input && typeof input.url === 'string') {
      return input.url;
    }
    return String(input);
  }

  function mockedResponse(data) {
    var body = typeof data === 'string' ? data : JSON.stringify(data);
    return {
      ok: true,
      status: 200,
      json: function () {
        return Promise.resolve(data);
      },
      text: function () {
        return Promise.resolve(body);
      },
    };
  }

  window.fetch = function (input) {
    var url = requestUrl(input);
    var mocks = config.mocks || {};
    if (Object.prototype.hasOwnProperty.call(mocks, url)) {
      return Promise.resolve(mockedResponse(mocks[url]));
    }
    return Promise.reject(
      new TypeError('Rede bloqueada no DIW Arcade: ' + url),
    );
  };

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function runAction(action) {
    if (action.do === 'wait') {
      await sleep(action.ms);
      return;
    }

    var element = document.querySelector(action.selector);
    if (!element) {
      throw new Error('Elemento não encontrado: ' + action.selector);
    }

    if (action.do === 'click') {
      element.click();
      return;
    }

    if (action.do === 'input') {
      element.value = action.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    throw new Error('Ação desconhecida');
  }

  var INTERNAL_ERROR_MESSAGE = 'Erro interno ao avaliar os requisitos.';

  /** Records each result into `results` as it goes, so a throw keeps them. */
  async function runRequirements(results) {
    var requirements = Array.isArray(config.requirements)
      ? config.requirements
      : [];

    for (var i = 0; i < requirements.length; i += 1) {
      var requirement = requirements[i];
      var outcome;
      try {
        var actions = Array.isArray(requirement.before)
          ? requirement.before
          : [];
        for (var j = 0; j < actions.length; j += 1) {
          await runAction(actions[j]);
        }
        await sleep(20);
        outcome = evaluate(requirement.check);
      } catch (error) {
        outcome = fail(describeError(error));
      }

      var result = { id: requirement.id, passed: outcome.passed };
      if (outcome.message) {
        result.message = outcome.message;
      }
      results.push(result);
    }
  }

  function post(message) {
    try {
      window.parent.postMessage(message, config.parentOrigin || '*');
    } catch {
      errors.push('Não foi possível responder à página principal.');
    }
  }

  /** Every requirement gets a result, even after an unexpected throw. */
  function completeResults(results) {
    var requirements = Array.isArray(config.requirements)
      ? config.requirements
      : [];
    var done = results.map(function (result) {
      return result.id;
    });
    requirements.forEach(function (requirement) {
      if (done.indexOf(requirement.id) === -1) {
        results.push({
          id: requirement.id,
          passed: false,
          message: INTERNAL_ERROR_MESSAGE,
        });
      }
    });
    return results;
  }

  function start() {
    setTimeout(function () {
      if (config.mode === 'test') {
        var results = [];
        runRequirements(results)
          .catch(function (error) {
            errors.push(describeError(error));
          })
          .then(function () {
            post({
              type: 'diw:result',
              nonce: nonce,
              requirements: completeResults(results),
              errors: errors,
            });
          });
      } else {
        post({ type: 'diw:ready', nonce: nonce, errors: errors });
      }
    }, 100);
  }

  /*
   * `pagehide` alone is not enough: for location.href = 'about:blank' Chromium
   * detaches the frame before its postMessage is delivered, while
   * `beforeunload` still arrives. But `beforeunload` also fires for
   * navigations that never unload the page (mailto:, tel:), so it is only
   * provisional: a short timer posts `diw:survived` if this document is still
   * alive, and the parent then cancels the pending failure. After `pagehide`
   * the page is gone for good and `diw:survived` is never posted.
   */
  var SURVIVED_DELAY_MS = 30;
  var pageHidden = false;

  function postUnload() {
    post({ type: 'diw:unload', nonce: nonce });
  }
  window.addEventListener('pagehide', function () {
    pageHidden = true;
    postUnload();
  });
  window.addEventListener('beforeunload', function () {
    postUnload();
    setTimeout(function () {
      if (!pageHidden) {
        post({ type: 'diw:survived', nonce: nonce });
      }
    }, SURVIVED_DELAY_MS);
  });

  /* Before student code runs: tells the parent this harness is alive. */
  post({ type: 'diw:started', nonce: nonce });

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }
})();
