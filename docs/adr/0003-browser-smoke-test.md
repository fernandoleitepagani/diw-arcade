# ADR-0003 — Browser smoke test and accessibility baseline

- Status: accepted
- Date: 2026-11-12

## Context

jsdom tests render React into a fake DOM. They can pass while the production
bundle fails to boot: an import cycle, a broken chunk split or a missing
asset produces a blank `#root` that unit tests never see. That happened once —
the production bundle shipped blank while every jsdom test was green — and
`scripts/check` had no way to notice. jsdom also has no layout engine, so it
cannot catch horizontal overflow on a phone, and axe running under jsdom
misses rendering-dependent rules such as colour contrast.

## Decision

### Real Chromium, built output

`npm run smoke` builds nothing. It expects `dist/` from `npm run build`, serves
that directory on a loopback static server and drives it in Chromium through
Playwright. Routes without a file extension fall back to `index.html` (the app
uses `createBrowserRouter`); a missing asset with an extension stays a 404 so
the same-origin error check can see it.

`scripts/lib/smoke-routes.ts` owns the route and viewport matrix:

- 12 routes: the ten navigable pages, `/boas-vindas` and an unknown path.
- 2 viewports: 1280×800 (desktop) and 375×812 (phone), with
  `prefers-reduced-motion` forced to `reduce`.

Every app route except `/boas-vindas` runs with an onboarded save seeded in
`localStorage`; the welcome route starts from a fresh save so it is not
redirected away. The seed is an `addInitScript`, which also runs inside the
sandboxed preview iframe of `/desafio`; it guards with `window === window.top`
and a `try/catch`, because `localStorage` throws on the iframe's opaque origin.

### What fails the gate

The routes are lazy: the shell renders long before the page chunk loads, and
the skeleton has no `main h1`. Each route therefore waits for `main h1`
(15000 ms) *before* measuring anything; a route whose heading never appears
fails and its skeleton is never measured.

For each route × viewport, in this order:

- `#root` never gets an element with visible text within 5000 ms;
- `main h1` never appears within 15000 ms (lazy route never rendered);
- `documentElement.scrollWidth` exceeds the viewport width by more than 1 px;
- an axe violation of impact `serious` or `critical` that is not in the
  baseline;
- an interaction probe fails: on `/no/n01/quiz` the smoke answers the current
  question and requires the feedback panel, and on `/no/n01/cartas` it reveals
  the card and requires the back of the card;
- a `console` error or an uncaught `pageerror`;
- a same-origin response with status 4xx or 5xx.

The last two groups are read only at the very end, after axe and the probes, so
errors emitted while the page is being inspected are not lost.

`scripts/lib/smoke-routes.ts` owns this ordering behind `checkRoutePage()` and
a small `RoutePage` seam. The unit tests drive the seam with an in-memory
harness and fix the order: blank check, heading wait, overflow, axe, probe,
error collection.

`--selftest` serves `scripts/smoke-fixtures/blank/index.html` (an empty
`#root`) and asserts the blank detector fires, then serves an inline overflow
fixture (built as a string in code, styled with the
`main h1 { min-width: 4000px; }` mutant from the review) and asserts the
overflow detector fires. A detector that never fires makes the selftest fail;
one that always fires makes the main smoke fail, so the pair pins the
behaviour in both directions.

### Baseline ratchet

`scripts/smoke-baseline.json` lists `{route, rule}` pairs for violations that
exist today. Matching is exact on both fields: the same rule on another route
still fails, and a new rule on a baselined route still fails. Only Task 24
(the final cleanup) may edit the file — removing entries as violations are
fixed, never adding them. Export `SMOKE_CHROMIUM_PATH` to point at a specific
Chromium binary.

### Builds must not download browsers

The Playwright version is pinned to `1.56.0`, the release whose
`playwright-core/browsers.json` lists `chromium-headless-shell` revision 1194,
so it matches a browser that may already be on the machine. `npm ci` on the
`playwright` package can try to download browsers; run it with
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. The smoke test never calls
`playwright install` itself.

## Consequences

- The blank-bundle failure is now reproducible: `npm run smoke -- --selftest`
  proves the detector works, and `npm run smoke` fails on a blank root.
- Rendering defects that jsdom cannot see (overflow, contrast, missing assets)
  now block the gate.
- The baseline makes the gate green on the current app while preserving every
  known violation as a ratchet; it must shrink, not grow.
- The smoke suite needs a real Chromium and a build, so it stays out of the
  fast unit-test loop and is invoked after `npm run build`.
