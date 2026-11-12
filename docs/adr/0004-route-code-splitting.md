# ADR-0004 — Route code splitting with dynamic import only

- Status: accepted
- Date: 2026-11-12

## Context

The production build shipped every page in one entry bundle. Before this
change the entry JS measured **397.09 KB gzip** (1,374.65 KB minified): the
route tree alone was not the cost — CodeMirror, the challenge runner, the
flashcard engine and all content were parsed before the first screen could
paint. A student landing on `/estatisticas` paid for the code editor they would
never open.

Vite already splits dynamic `import()` boundaries. The project needs the
behaviour, not a chunk-tuning configuration: manual `manualChunks` rules tend
to drift from the route tree, duplicate modules between chunks, and are hard to
verify.

## Decision

### Every page is a dynamic import

`src/app/router.tsx` declares each page with `React.lazy(() =>
import(...).then(...))`: tree, node, labs, lab guide, stats, settings, quiz,
flashcards, challenge, onboarding and the not-found page. The shell — `Layout`,
`SessionLayout`, `RequireOnboarding`, HUD and navigation — stays in the entry
so the chrome paints immediately and a route change never flashes an empty
frame.

No chunk configuration is added to `vite.config.ts`: there is no
`manualChunks`, no Vite `codeSplitting` option and no `advancedChunks`. The
route tree is the single source of the split, so adding a page cannot silently
miss the boundary.

### One Suspense boundary per layout

Both layouts wrap their `<Outlet />` in `<Suspense fallback={<PageSkeleton />}>`.
Onboarding renders outside the layouts, so its route element carries its own
`Suspense` with the same fallback. `PageSkeleton` is the shared UI primitive: a
polite `role="status"` live region whose visible text is the screen-reader-only
label "Carregando…". It reserves the page height with skeleton shapes, so the
layout does not jump when the page chunk arrives, and it needs no motion, so
`prefers-reduced-motion` is honoured by construction.

### Budget ratchet

Route splitting cut the entry JS from **397.09 KB gzip** to **67.46 KB gzip**
on this branch. The build now emits **20 JS chunks** (eleven page chunks plus
shared vendor/UI chunks). `scripts/budget.config.json` records both
measurements and lowers `entryJsGzipKb` to **75**, which is
`ceil(67.46 × 1.10)` — 10% headroom for future shell code. Entry CSS also fell
from 31.13 KB to 23.76 KB gzip because page styles moved with their chunks. The
total JS budget (463 KB) is unchanged; splitting moves bytes out of the entry
without hiding growth elsewhere.

## Consequences

- The first screen parses ~330 KB gzip less JavaScript. Shared code still
  loads on demand; the total bundle grows slightly (427.1 → 437.51 KB gzip)
  because small shared chunks add boundaries.
- `routes.test.tsx` proves the skeleton-then-page contract: "Carregando…" is
  visible synchronously, then the page heading appears. Route assertions await
  the heading because the page is no longer synchronous.
- The smoke test exercises the built chunks in Chromium, so a broken dynamic
  import fails the gate as a blank root or a 404.
- A future page must be declared lazily in `router.tsx`; a static import would
  quietly return the page to the entry bundle, which the entry budget now
  catches.
