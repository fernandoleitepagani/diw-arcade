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
  `TypeError("Rede bloqueada no DIW Arcade: " + url)`. This does not cover
  self-navigation: `location.href = 'http://x/?dado=...'` or a
  `<meta http-equiv="refresh">` sends a top-level request of the frame itself,
  which neither `connect-src` nor `form-action` governs and which the CSP meta
  cannot block. It is a pre-existing channel (it was open before the
  lifecycle signals and `allow-forms`) and this change does not widen it. The
  harness reports such a navigation as the NAVIGATION failure, but only after
  the request is sent. Mitigations considered: `navigate-to` in the CSP (never
  shipped in browsers), a `Worker`-based grader (out of scope), blocking
  navigation from the harness (`beforeunload` cannot cancel it reliably in a
  sandboxed frame). The data in the frame is a student's own challenge code,
  within the threat model above, so it is accepted.
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
- running, a second `diw:started` -> fail at once with
  "O código recarregou ou navegou a página (location.reload / location.href).";
  `diw:unload` (also while loading) starts a `UNLOAD_GRACE_MS` timer that fails
  with the same message, and `diw:survived` cancels it (see "`diw:unload` is
  provisional" below);
- running, total timer fires -> fail with "Tempo esgotado (loop infinito?)",
  or with the navigation message when an accepted `diw:unload` was seen in this
  run (see "`diw:unload` is provisional" below);
- `diw:result` (test) or `diw:ready` (preview) -> ok. After settling the
  listener is gone and the grace timer is cleared, so later `diw:unload` and
  `diw:survived` messages are ignored.

A failure removes the iframe and resolves `{ status: "timeout" }` with every
requirement failed with that message and `errors` set to `[message]`; the
preview lists the same text. Inside the harness, `describeError` is total, and
`runRequirements` records results as it goes: a throw outside the
per-requirement try/catch still posts a `diw:result` with every missing
requirement failed ("Erro interno ao avaliar os requisitos.").

`diw:unload` is provisional. `pagehide` alone is not enough: for
`location.href = 'about:blank'` Chromium detaches the frame before the message
is delivered, so the harness also listens to `beforeunload`. But
`beforeunload` fires for navigations that never unload the page
(`location.href = 'mailto:...'`, a click on `<a href="mailto:">` or `tel:`).
So the harness sets a 30 ms timer on `beforeunload` and posts `diw:survived`
if `pagehide` has not fired; the parent waits `UNLOAD_GRACE_MS` (200 ms) after
a `diw:unload` before failing with the navigation message, and cancels the
pending failure on `diw:survived` (a `diw:result` or `diw:ready` settles the
run anyway). A real reload still fails at once through the second
`diw:started`; an `about:blank` navigation fails after the grace period (about
230 ms measured end to end). A real unload after a survived one re-arms the
grace period.

The grace window is 200 ms against a 30 ms `diw:survived` delay. On a loaded
machine or a slow frame a late `diw:survived` can lose that race, and the run
then reports the navigation failure instead of grading. This is a deliberate
trade-off: a wider window delays every real `about:blank` navigation and the
failure is at least truthful about what the code did.

A navigation to a URL whose request is still in flight (`location.href =
'obrigado.html'` with a slow response) posts `diw:survived` 30 ms after
`beforeunload`, so the parent cancels the grace timer. When the navigation
commits, the `pagehide` `diw:unload` comes from a frame that no longer matches
`iframe.contentWindow` and is ignored, and no result ever arrives. The parent
therefore remembers that an accepted `diw:unload` was seen in the run, and when
the total timer fires with no result it reports the navigation message instead
of the loop text. The failure takes the full total budget (3 s) in that case.
Failing earlier, for example on a second iframe `load` event, was rejected: it
is a new mechanism with unverified Firefox behaviour, and a fixed short window
after `diw:unload` would misfire on a `mailto:`/`tel:` run that is still
grading. A `mailto:` assigned while the document is still loading gets no
answer in headless Chromium (measured, cause not investigated); the run now
ends with the navigation message when `diw:unload` was seen, and as a timeout
when it was not. A genuine loop never posts `diw:unload` and still reports the
loop text. `npm run smoke -- --runner` proves the slow navigation (probe
`navegacao-lenta` for the signals, e2e `navegacao lenta` for the message on
the built page).

Limits. A synchronous infinite loop in the frame is only interrupted when the
browser runs the sandboxed (opaque-origin) frame in its own process; without
that isolation the loop blocks the page, the parent's timers cannot fire and
no message arrives. `while (true) {}` and a microtask-starvation loop
(`function f() { Promise.resolve().then(f); }`) both freeze a non-isolated
tab the same way. The timers cover asynchronous stalls and a harness that
never starts. A Worker-based grader that could stop such loops is out of scope.
`runInJsdom` uses the same 3000 ms for asynchronous stalls and cannot detect
navigation. `form.submit()` fires no `submit` event and reloads a sandboxed
srcdoc even with `form-action 'none'`, so the harness replaces
`HTMLFormElement.prototype.submit` with a no-op; `location.reload()` and
`location.href` are not neutralised and are reported through the signals
above. Known limitation: an `<a href="#x">` click navigates the srcdoc frame
to the parent URL plus the hash, because `about:srcdoc` inherits the parent
base URL. That is a real navigation of the frame; it is now reported as the
navigation failure instead of a 3 s timeout, and it is not intercepted. `npm run smoke -- --runner` proves reload, `href = 'about:blank'` (a
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
- `submit` is not composed, so a form inside a shadow root never reaches the
  window listener. The harness wraps `Element.prototype.attachShadow` and adds
  the same capture-phase `preventDefault` listener to every shadow root it
  creates, open or closed (probed in Chromium). Declarative shadow DOM
  (`<template shadowrootmode>`) is built by the parser without calling
  `attachShadow`, so a submit inside it is not guarded (not probed); a reload it
  causes would be reported as the navigation failure. Known limitation;
- the real-browser probe (below) proves the isolation: `parent.document`,
  `localStorage` and cookies are unreachable, `top.location` assignment does
  not move the parent, `window.open` returns `null`, and forms with
  `target="_top"` or `"_blank"` neither navigate the parent nor open a page.

### Real-browser probe

`npm run smoke -- --runner` (ADR-0003) runs the same srcdoc, harness and
sandbox flags in Chromium: submit with and without `preventDefault`,
`form.submit()`, `requestSubmit()`, forms inside shadow roots, the isolation
checks (asserted from the parent, since no marker inside the frame can prove
that `top.location` assignment was contained), `mailto:`/`tel:` navigations, every reference solution and the n20-c02
starter as a negative control. It closes the jsdom
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
