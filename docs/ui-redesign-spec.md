# DIW Arcade UI redesign: spec and order of work

Status: approved by the user on 2026-11-13; updated the same day for the new `main` (section 10). Supersedes sections 4 to 9 of `ui-redesign-plan.md`; the diagnosis there still stands.
Reference: the approved prototype, `~/Projects/DIW-Gameplay-ui/prototype/ui-redesign/` (branch `proto/ui-redesign`, scratch, never merged). Its `NOTES.md` has tokens, contrast numbers and known issues. Screens to match are in `shots/`.

## 1. Decisions already made
- Direction **Trilha v3**: pixel-grid identity (stepped corners, dithered empty progress, 8x8 pixel sprites and icons), trail as the product, unit color means content only, off-white primary button.
- Pixel font (Pixelify Sans) only for short display titles, the brand and big numbers, never below 20 px. Body Hanken Grotesk, code JetBrains Mono.
- **Dark and light themes** from v1. Light has its own unit-color variants.
- **"Ler" primers ship in v1**: 6 to 10 sourced key points per node.
- **Homepage** (public landing) where the trail is the layout.
- Unit colors stay as in the prototype, keyed by unit id (`u1` to `u6`) in the UI token map, since `tree.ts` has no color field. Fundamentos da Web is neutral gray; Dados e JavaScript uses the JavaScript yellow; the Dados teal stays unused.
- Progresso keeps the existing stats, restyled; unimplemented parts read "Ainda não implementado" (decision 1).
- Information architecture: three destinations (Hoje, Trilha, Progresso), avatar menu for Ajustes, four-step lesson per node (Ler, Praticar, Fixar, Construir).

## 2. Scope and constraints
In scope: tokens, fonts, theme, primitives, shell and routes, Hoje, Trilha, node lesson, Ler primers (schema, content, view), session shells and summaries, challenge layout, landing page, cleanup.
Out of scope: XP economy, SRS math, the runner, content JSON beyond adding primers, a Progresso redesign.
Constraints that stay (from `REVIEW.md` and `AGENTS.md`):
- All copy PT-BR. Everything keyboard-operable. `prefers-reduced-motion` honored. Phone 375 px must work.
- Lint, typecheck, tests, `validate:content`, build, smoke, axe baseline (zero), and the bundle budget stay green. Test edits only where markup or routes change on purpose.
- No course PDFs or Canvas data in the repo.

## 3. Target design (summary; pixels are in the prototype)
- **Tokens** (`src/styles/tokens.css`): the prototype's `tokens.css`, dark default, `[data-theme=light]` override. Theme choice lives in its own localStorage key (`diw-theme`), outside the versioned progress schema.
- **Primitives** (feature-agnostic, in `src/components/`): `PixelPanel` (stepped corners), `Button` (primary and quiet, stepped), `SegBar` (segmented with dither), `PixelSprite` and `PixelIcon` (SVG from string grids), `NodeDisc` (done, current, todo), `Stepper`, `Tag`. Replace `Card`, `Panel`, `ProgressRing`, `ProgressBar`, `StarRating`, `Badge`, `Mascot` (Bit becomes a sprite).
- **Fonts** via `@fontsource`: add Pixelify Sans and Hanken Grotesk; keep JetBrains Mono; remove Press Start 2P and Inter.
- **Removed**: Aurora, ClickSpark, ShinyText, count-ups, the permanent HUD (becomes one line in the header).

## 4. Routes
| Route | Screen |
|---|---|
| `/` | Landing page (first visit). Returning, onboarded users go straight to `/hoje` (see decision 2). |
| `/hoje` | Hoje: one next step from state, two or three alternates, today's goal as one sentence. |
| `/trilha` | The trail. Node links go to the lesson. |
| `/no/:nodeId` | Lesson with the four steps; `?passo=ler` and so on. |
| `/no/:nodeId/quiz`, `/cartas`, `/revisao`, `/desafio/:id` | Focus-mode sessions. Existing paths stay. |
| `/progresso` | Placeholder (decision 1). |
| `/boas-vindas`, `*` | Existing, restyled. |
Old routes (`/estatisticas`, `/ajustes`, `/laboratorios`) redirect so saved links work. Laboratórios appear as "Projetos" at the end of their unit on the trail.

## 5. Data and behavior changes
1. **Next-step selector** (`src/lib/progress/nextStep.ts`, pure and tested): rank due flashcards, then the first unfinished step of the current node, then the recommended node. Reuses `recommend.ts` and the due-card selectors.
2. **Lesson step state**: derived from existing progress where possible (Praticar from quiz results, Fixar from SRS, Construir from challenge results).
3. **Ler read state needs persistence**: no field exists today. Add a small additive field to the progress schema (`primersRead`) with a schema-version migration. This touches `src/lib/storage/**` and is a **high-risk path** (REVIEW: "progress: localStorage schema change loses or corrupts user progress"). It needs a migration test, an import/export test and adversarial review (decision 3).
4. **Primer schema**: `primers.json` per node, validated by zod: `{ nodeId, points: [{ title, body, code?, source: { aula, slide }, evidence }] }`, 6 to 10 points. The validator checks each `evidence` against the slide text exactly as it does for questions and cards.
5. **"O que você já domina"**: the list of the node's terms with a state. Source decided in decision 4 (default: the node's flashcard fronts, state from SRS).

## 6. Order of work
The Prova 2 content run has landed on `main` (see section 10), so no wave has to wait for it. Branch every run from the current `main`.

| Wave | Goal | Allowed files (main ones) | Done when | Risk |
|---|---|---|---|---|
| 0. Foundation | Tokens, fonts, theme, primitives, sprites. Nothing visible changes yet except the theme toggle in Ajustes. | `src/styles/**`, `src/components/**`, `package.json` | New primitives have unit tests (keyboard, focus, reduced motion); a token test checks AA for muted text and 3:1 for graphics in both themes. | standard |
| 1. Shell and IA | Header, tab bar, three routes, avatar menu, redirects, Hoje with the selector, 404 and error pages. | `src/app/**`, `src/features/hud`, new `src/features/today`, `src/lib/progress/nextStep*` | Route and smoke tests updated; `nextStep` covered by tests; old routes redirect; smoke screenshots at both widths. | standard |
| 2. Trilha | Path, discs, unit labels, node states, Projetos. | `src/features/tree/**` | Matches `shots/*-trilha.png`; node states derived from real progress; axe zero. | standard |
| 3. Lesson | Four-step stepper, one Continuar, mastery segments, domina list. | `src/features/tree/NodePage*`, new `src/features/lesson` | Continuar always points to the first unfinished step; steps can be done in any order. | standard |
| 4a. Primer schema and storage | Primer schema, validator, `primersRead` field and migration. | `src/content/schema.ts`, `scripts/validate-content.ts`, `src/lib/storage/**`, `src/lib/progress/**` | Migration, import/export and corrupt-data tests pass; adversarial review clean. | **high** |
| 4b. Primer content | 20 primers, one per node (n01 to n20), from the slides, the TIAW documents, the course repo and the Prova 2 guidance. | `src/content/nXX/primers.json` | `validate:content` passes with evidence; one reviewer per batch checks accuracy. Builders run one at a time. | standard (content accuracy) |
| 4c. Ler view | Primer view with code blocks and the source line. | `src/features/lesson/**` | Matches `shots/*-ler.png`; marks the step read. | standard |
| 5. Sessions | Focus-mode shells for quiz, cards, challenge; feedback bar; summary that ends in one next-step button chained to the selector. | `src/features/quiz`, `flashcards`, `challenge`, `src/app/SessionLayout*` | Matches the quiz, summary and challenge shots; keyboard A to D and Enter work; confirm-on-exit preserved. | standard |
| 6. Landing | The trail-as-page homepage. | new `src/features/landing`, `src/app/router.tsx` | Matches `shots/*-index.png`; works with JS-light rendering; first-visit redirect logic tested. | standard |
| 7. Cleanup and proof | Delete dead code and CSS, fonts and effects; update smoke baseline; budget; before and after screenshots. | repo-wide, deletions only | Lint, typecheck, tests, content, build, smoke, budget green; axe zero; screenshots of every screen at 1280 and 375 in both themes reviewed by you. | standard |

Each wave is its own run on its own branch off `main`, merged only after you approve (`never-block-on-the-human`: nothing is pushed or merged without your word). Each task commits the failing test first.

## 7. Verification
- Deterministic: `scripts/check` (lint, typecheck, tests, content, build) plus smoke, budget and axe.
- Visual: Playwright screenshots against the prototype's `shots/`, at 1280 and 375, dark and light. A reviewer looks at them; builders cannot.
- Contrast: token test, extended to both themes.
- Known risks from the prototype: clip-path clips focus outlines (focus ring must draw inside); the Pixelify lowercase "f" resembles "A" (keep pixel type to short titles); no real keyboard or screen-reader test yet (wave 7 adds it).

## 8. Decisions (resolved)
1. Progresso hosts the existing statistics content, restyled with the new tokens only. "Ainda não implementado" appears only for parts that do not exist.
2. `/` shows the landing on the first visit; after onboarding it redirects to `/hoje`. The brand link still opens the landing.
3. "Ler" is persisted: additive `primersRead` field with a migration (wave 4a, high risk).
4. "O que você já domina" comes from the node's flashcard fronts, with state from SRS.
5. Run order: the content run is finished; follow the rounds in section 9.

## 9. Rounds (up to three builders at a time)
| Round | Runs in parallel |
|---|---|
| 0 | W0a tokens, fonts, theme · W0b primitives · W0c sprites, icons, discs |
| 1 | W1 shell and navigation · W3 lesson page · W4a primer schema and storage (high risk) |
| 2 | W4b-A primers n01 to n10 · W4b-B primers n11 to n20 · W5 sessions and summaries |
| 3 | W4c Ler view · W6 landing page · W2 Trilha |
| 4 | W7 cleanup and proof (alone; fix rounds use the spare slots) |
A wave starts as soon as its dependencies are merged, even before the rest of its round finishes, as long as no more than three builders run. Merge order where files overlap: W1, then W5, then W6. Reviews run through `maestro build --review` on `reviewer.env` (GLM); the explorer runs through `glm.sh`.

## 10. Update after `main` moved (Prova 2 content run merged)
Checked `main` at `40d54f0`: 70 commits since the prototype's base, 62 files, mostly content. What changed in the plan:
1. **20 nodes and 6 units, not 14 and 5.** `tree.ts` now has u6 "Prova 2" with six real nodes (n15 Leitura de código: escopo, hoisting e execução; n16 Tipos, igualdade e coerção; n17 DOM e eventos; n18 URLs e parâmetros de consulta; n19 Assíncrono: promises, async/await e fetch; n20 Formulários e validação com JavaScript). The prototype's two invented Prova 2 nodes are replaced by these. Wave 2 must handle a 20-node trail: collapse finished units into one line and keep the current unit open.
2. **Primers: 20 not 14.** Wave 4b splits n01 to n10 and n11 to n20.
3. **Sources have four kinds now** (`aula`, `tiaw`, `repo`, `orientacao`, in `src/content/source.ts` and `schema.ts`). The primer schema reuses `SourceSchema`, and `evidence` is checked for every kind, not only aulas. The source line in the UI uses `formatSource`.
4. **Source label copy breaks the copy rules.** `formatSource` prints `aula-174` and joins parts with a middle dot ("Fonte: TIAW · ..."). Wave 5 changes it to the prototype's form ("Fonte: aula 174, slide 3"; "Fonte: TIAW, Design Thinking, slide 4") and updates `source.test.ts`.
5. **Quiz and cards changed**: `QuizRound` now renders executed code blocks and captions, and `FlashcardSession` changed. Wave 5 starts from that code and keeps `QuizRound.test.tsx` passing.
6. **Content questions can carry `code` that the validator executes** (new gotcha in `AGENTS.md`). Primer code snippets are display-only, not executed, unless we decide otherwise.
7. **Gate removed.** W4a no longer waits for the content run, and the run can start in round 1 as planned.
8. **Baselines**: the old "452 tests" figure is stale. Every wave records `npm test` counts and the smoke baseline from `main` at its start. 63 test files exist now.
9. **Prototype**: it still shows 14 nodes and a fake Prova 2. It is scratch and I would not redo it, but the trail on 20 nodes is the longest screen, so wave 2 must review it with screenshots.
