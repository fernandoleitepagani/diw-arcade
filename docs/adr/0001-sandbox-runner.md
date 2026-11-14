# ADR-0001 — Sandbox runner, harness and grading

- Status: accepted
- Date: 2026-11-12

## Context

Code challenges must run the student's HTML, CSS and JavaScript without
letting that code touch the parent page, `localStorage`, cookies or the
network. The same submission is previewed in the browser, graded in the
browser and graded again by the content validator in Node. The two graders
must agree, and a broken or hostile submission must never hang the app or the
validator. DIW Arcade has no backend and no runtime network, so the runner is
the only place where untrusted code executes.

## Threat model

- **Untrusted:** the challenge `html`, `css` and `js`, including code that
  loops forever, throws, navigates, opens popups, submits forms or calls
  `fetch`.
- **Trusted:** the challenge JSON, the harness, the parent app and the
  validator. A student forging their own grade is explicitly out of scope; the
  grade protects curiosity, not a credential.
- **Isolation:** the code runs in a fresh iframe with
  `sandbox="allow-scripts allow-forms"` (`SANDBOX_FLAGS` in `srcdoc.ts`) and
  nothing else. Without `allow-same-origin` the frame has an opaque origin: it
  cannot read the parent DOM, its storage, cookies or origin-bound APIs, and
  it gets no top navigation, popups, modals or downloads. Forms are allowed
  only so submit handlers run; see "Forms in the sandbox".
- **Network:** the srcdoc CSP sets `connect-src 'none'` and restricts images,
  fonts and media to `data:`/`blob:`. The harness additionally replaces
  `fetch`: URLs listed in `challenge.mocks` resolve with a synthetic 200
  response; every other URL rejects with
  `TypeError("Rede bloqueada no DIW Arcade: " + url)`.
- **Messages:** the parent accepts a message only when `event.source` is the
  iframe's `contentWindow`, the embedded nonce matches, and the zod schema in
  `messages.ts` parses. Anything else is ignored.
- **Escaping:** the config JSON replaces every `<` with the JSON escape
  `backslash-u-0-0-3-c`, and every `</script` in user JavaScript becomes
  `<\/script`, so neither can close the surrounding script element.

## Decision

### Declarative checks

The harness evaluates typed checks; it never `eval`s author-supplied code.
The kinds live in `src/content/schema.ts`:

- `exists`: `querySelector` finds the element;
- `count`: `querySelectorAll` length is within `min`/`max`;
- `attr`: the attribute exists and, when a matcher is present, its value
  matches;
- `text`: the element's `textContent` matches;
- `style`: the declared value of `prop` on the element matches;
- `media`: an `@media` rule contains the declared value;
- `noErrors`: the harness captured no `error`/`unhandledrejection` events.

Matchers are `equals`, `oneOf` or a case-insensitive `pattern` regex. Values
are normalized before matching: lowercase, trim, collapse whitespace and
remove spaces after commas. Because CSSOM serializes colours as
`rgb()`/`rgba()` even when the author wrote hex, the harness also tries the
equivalent hex/rgb spelling as a candidate. Colours must use a `pattern`
matcher so a serialization difference cannot silently pass a wrong colour.

### Actions

A requirement may list `before` actions, executed in order before the check:
`click` calls `element.click()`; `input` sets `value`, then dispatches bubbling
`input` and `change` events; `wait` sleeps up to 1000 ms. The harness waits
20 ms after the actions so frameworks and timers settle, then evaluates the
check inside `try`. A missing action target or a throwing check fails that
requirement with a PT-BR message.

### Declared-style semantics

- An inline `style` value for the property wins.
- Otherwise take the last **top-level** `CSSStyleRule` whose selector matches
  the element through `element.matches(rule.selectorText)` and whose property
  value is non-empty.
- Specificity, the cascade and the computed value are deliberately ignored.
  Two author rules that both match are resolved by source order, not by
  selector weight.
- `style` ignores `@media` blocks: only rules that are direct children of a
  stylesheet are considered.
- `media` inspects `CSSMediaRule`s instead: a rule is considered when
  `conditionText` matches the `condition` regex, its normalized
  `selectorText` equals the requested selector, and the declared property
  matches. Nested media blocks are not traversed.

Reading declared values keeps the grader stable across browsers and jsdom and
avoids requiring a layout engine. It also means the grade answers "did the
author write this declaration?" rather than "what would the page look like?".

### jsdom / browser parity limits

`runInJsdom` builds the same srcdoc and executes the same harness under JSDOM
with `runScripts: "dangerously"`. The content validator uses it for every
challenge's reference solution and starter, so a challenge that cannot pass in
jsdom fails validation before it ships.

Known differences:

- JSDOM has no layout, so checks may not depend on computed sizes, positions,
  stacking or media-query evaluation. The harness reads declared values and
  `conditionText` instead of `getComputedStyle`/`matchMedia`.
- JSDOM's CSS parser serializes values through `cssstyle`; shorthand
  serialization can differ from a browser. Content must use longhands or a
  `pattern` where serialization may vary.
- JSDOM has no `unhandledrejection` DOM event. `runInJsdom` installs a
  process-level listener so a rejected user promise cannot abort the validator;
  the browser harness records it as an error, jsdom does not.
- A synchronous infinite loop cannot be interrupted in jsdom: it runs on
  Node's event loop, so the validator could hang. The browser path is safe
  because the parent owns the timer. Content review is the safeguard for
  validator runs.
- JSDOM does not load external resources. The srcdoc CSP and the fetch mock
  enforce the same no-network rule in the browser.

### Timeout policy

`runInIframe` starts two timers when it assigns the srcdoc, after any library
CSS has loaded: a start timer (`startTimeoutMs`, default 1000 ms, capped by the
total) and a total timer (`timeoutMs`, default 3000 ms). The harness posts
`diw:started` synchronously before student code runs and `diw:unload` on
`pagehide`. The parent accepts each message only when `event.source` is the
iframe window, the nonce matches and the zod schema parses. States:

- loading, `diw:started` -> running; start timer fires -> fail with
  "O ambiente de testes não iniciou. Tente executar de novo.";
- running, a second `diw:started` or `diw:unload` -> fail with
  "O código recarregou ou navegou a página (location.reload / location.href).";
  `diw:unload` while loading is the same failure;
- running, total timer fires -> fail with "Tempo esgotado (loop infinito?)";
- `diw:result` (test) or `diw:ready` (preview) -> ok. After settling the
  listener is gone, so later `diw:unload` messages are ignored.

A failure removes the iframe and resolves `{ status: "timeout" }` with every
requirement failed with that message and `errors` set to `[message]`; the
preview lists the same text. Inside the harness, `describeError` is total, and
`runRequirements` records results as it goes: a throw outside the
per-requirement try/catch still posts a `diw:result` with every missing
requirement failed ("Erro interno ao avaliar os requisitos.").

Limits. A synchronous infinite loop in the frame is only interrupted when the
browser runs the sandboxed (opaque-origin) frame in its own process; without
that isolation the loop blocks the page, the parent's timers cannot fire and
no message arrives. The timers cover asynchronous stalls and a harness that
never starts. A Worker-based grader that could stop such loops is out of scope.
`runInJsdom` uses the same 3000 ms for asynchronous stalls and cannot detect
navigation. `form.submit()` fires no `submit` event and reloads a sandboxed
srcdoc even with `form-action 'none'`, so the harness replaces
`HTMLFormElement.prototype.submit` with a no-op; `location.reload()` and
`location.href` are not neutralised and are reported through the signals
above. `npm run smoke -- --runner` proves reload, `href = 'about:blank'` (a
signal within 1500 ms) and `location.hash` (no signal, graded normally) in
real Chromium.

### Forms in the sandbox

Without `allow-forms` a sandboxed frame blocks form submission before the
`submit` event is dispatched. A student's `submit` handler therefore never ran
in a real browser, and every challenge that grades a form (n18-c01, n19-c04,
n20-c01 to n20-c05) failed there while passing in jsdom, which implements
neither the sandbox nor the block.

The decision is to add `allow-forms`: `SANDBOX_FLAGS = 'allow-scripts
allow-forms'`. It is safe because:

- the frame is still an opaque origin: no `allow-same-origin`,
  `allow-top-navigation*`, `allow-popups`, `allow-modals` or `allow-downloads`;
- `harness.js` registers, before anything else, a capture-phase `submit`
  listener on `window` that calls `preventDefault()` and does not stop
  propagation. Student handlers still run and see `defaultPrevented === true`,
  but no submit button can navigate the frame;
- the CSP keeps `form-action 'none'`;
- `form.submit()` fires no `submit` event, so the guard never sees it, and in
  Chromium it reloads a sandboxed srcdoc frame even under `form-action 'none'`
  (measured: the `start` and `pagehide` messages repeat). The harness replaces
  `HTMLFormElement.prototype.submit` with a no-op. `requestSubmit()` fires a
  `submit` event and is covered by the guard;
- the real-browser probe (below) proves the isolation: `parent.document`,
  `localStorage` and cookies are unreachable, `top.location` assignment does
  not move the parent, `window.open` returns `null`, and forms with
  `target="_top"` or `"_blank"` neither navigate the parent nor open a page.

### Real-browser probe

`npm run smoke -- --runner` (ADR-0003) runs the same srcdoc, harness and
sandbox flags in Chromium: submit with and without `preventDefault`,
`form.submit()`, `requestSubmit()`, the isolation checks, every reference
solution and the n20-c02 starter as a negative control. It closes the jsdom
divergence above: the validator can say a solution passes while the sandbox
blocks it, and only the probe sees that.

### Why the parent page sets no CSP

The runner page itself sets no Content-Security-Policy. A parent CSP is
inherited by a `srcdoc` frame and can only be tightened by the child's meta
tag, never relaxed. A `script-src` that protects the app would therefore also
block the inline harness and the student's inline script, which are the point
of the sandbox. Isolation is instead per frame: `sandbox="allow-scripts allow-forms"` for
origin separation and a meta CSP inside each srcdoc for network separation.
The app has no runtime network by construction (ESLint bans network globals,
fonts and assets are bundled), so the parent does not need a CSP to keep user
code out.

## Consequences

- A submission cannot reach the parent, storage or the network, and the app
  cannot be hung by a synchronous loop in an iframe.
- Grades are deterministic, declarative and reproducible in jsdom and the
  browser, at the cost of not grading visual/layout outcomes directly.
- Colour checks must use `pattern`; inline styles and source order decide
  declared-style checks.
- Every future check kind or harness change must keep the browser and
  `runInJsdom` paths in sync and update this ADR.
