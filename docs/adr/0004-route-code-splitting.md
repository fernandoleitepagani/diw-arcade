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

Route splitting cut the entry JS from **397.09 KB gzip** to **224.91 KB gzip**
on this branch. That after figure is the whole startup set, not just the
`<script src>`: `scripts/lib/budget.ts` counts the entry script plus every
`<link rel="modulepreload">` JS in the built `index.html`. The preloaded chunks
are the bulk of it — ProgressProvider 123.03 KB, the shared chunk 29.03 KB and
UI 5.39 KB gzip on top of the entry script's 67.46 KB. Measuring only the script
tag would report 67.46 KB and understate the real startup cost by more than
three times.

The build now emits **20 JS chunks** (eleven page chunks plus shared vendor/UI
chunks). `scripts/budget.config.json` records both measurements and sets
`entryJsGzipKb` to **248**, which is `ceil(224.91 × 1.10)` — 10% headroom for
future shell code. Entry CSS also fell from 31.13 KB to 23.79 KB gzip because
page styles moved with their chunks. At the time of this decision the total JS
budget (463 KB) was unchanged; splitting moves bytes out of the entry without
hiding growth elsewhere.

### Prova 2 content grew the startup set

The Prova 2 complement added six nodes (`n15`–`n20`) and extended `n04`, `n10`,
`n13` and `n14`. `src/content/index.ts` imports every content JSON eagerly, so
that material now ships in the preloaded startup set: entry JS grew from
**224.91 KB** to **288.65 KB gzip** and total JS from 437.46 KB to 502.17 KB.
The budget was re-baselined to `ceil(288.65 × 1.10) = 318` KB entry JS,
`ceil(23.93 × 1.10) = 27` KB entry CSS and `ceil(502.17 × 1.10) = 553` KB total
JS, keeping the same 10% headroom. Lazy-loading content per node is the proper
follow-up; implementing it was out of scope for this change.

## Consequences

- The first screen parses ~172 KB gzip less JavaScript (397.09 → 224.91 KB).
  Shared code still loads on demand; the total bundle grows slightly
  (427.1 → 437.46 KB gzip) because small shared chunks add boundaries.
- `routes.test.tsx` proves the skeleton-then-page contract: "Carregando…" is
  visible synchronously, then the page heading appears. Route assertions await
  the heading because the page is no longer synchronous.
- The smoke test exercises the built chunks in Chromium, so a broken dynamic
  import fails the gate as a blank root or a 404.
- A future page must be declared lazily in `router.tsx`; a static import would
  quietly return the page to the entry bundle, which the entry budget now
  catches.
