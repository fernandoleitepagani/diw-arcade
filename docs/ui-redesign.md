# DIW Arcade: UI redesign (Trilha), full plan

Last updated 2026-11-13. This file collects the whole plan in one place: the original diagnosis and design plan (part 1), the approved spec and order of work that supersede parts of it (part 2), the execution plan with all 55 tasks (part 3) and the current status (part 4). Nothing here is implemented in `main` yet.

Contents:
1. Original plan: diagnosis, direction, tokens, information architecture, wireframes, copy rules
2. Approved spec: decisions, scope, routes, data changes, waves, rounds, resolved decisions, updates after the Prova 2 content merge
3. Execution plan: the 55-task graph
4. Status, prototype and how the work runs

---

# Part 1. Original plan


Status: plan only, nothing built. Written 2026-11-12 from the live app (screenshots at 1280 and 375 px), the code, and `~/Projects/DesignInspo`.
Brief: the site looks vibecoded and AI-generated, the UX is poor and the modules are not integrated, the UI is too complex and not organic or modern. Target: a gamified computer-science course site that students open daily.

## 1. Diagnosis

### Visual tells (what reads as generated)
| Tell | Where it shows | Why it reads generic |
|---|---|---|
| Dark navy plus cyan and magenta neon, glow shadows | everywhere | Near-black plus bright accent is the most common generated look. The glows are the same soft shadow on every surface. |
| Pixel font (Press Start 2P) on every title | h1, unit banners, HUD | A theme costume, not a choice for this subject. It hurts legibility at 20 px. |
| Everything is a rounded card with a glow border | home, node page, stats, quiz, challenge | One radius, one shadow, no hierarchy. Cards inside cards. |
| Template chrome | `UNIDADE 3 · CSS`, `DESAFIO DE CSS`, `Aulas: 172`, `quiz cartas código` under every node | Tracked all-caps eyebrows and middle-dot meta strings above or under content that needs no label. |
| Effects as decoration | aurora background, click sparks, shiny text, bobbing mascot | Motion that nobody asked for. It competes with the content. |
| Three stars per node | tree | Three unlabeled shapes encode three different things. |

### UX problems (what hurts)
1. **Modules are silos.** Quiz, Cartas, Código, Laboratórios, Estatísticas and Ajustes are five separate destinations. A student has to decide what to do and where to go. Nothing says "do this next".
2. **Too many top-level places.** Five nav items plus a HUD plus a hero plus a side panel on home. Four things compete for the first click.
3. **A node is a menu of three cards, not a lesson.** There is no teaching moment. The student is dropped into questions with no primer, and the cards and code never refer back to the quiz.
4. **Progress is unreadable.** Three empty stars, a 0-XP ring and a "Nova" chip say nothing about what is done and what is left.
5. **Gamification is loud, not useful.** XP and streak are in a permanent HUD, but the daily goal does not drive any recommendation.
6. **Sessions start and end abruptly.** The summary screen is new, but it does not feed the next step.

## 2. What to take from DesignInspo, and what not to

Read: Modal, Graphite, Liveblocks, Cursor (and skimmed the other nine). Common traits:
- **One grotesk family, tight tracking** at large sizes (-0.02em to -0.03em), 400 and 500 weights only.
- **Hairline 1 px borders instead of shadows.** Depth comes from surface steps (#0a0a0a to #171717 to #262626), not glow.
- **Color is rationed.** Modal has one lime, Graphite has one orange for links only, Liveblocks reserves violet for the brand moment. Everything else is neutral.
- **Monospace only for code.**
- **Big, calm headlines and generous space**; the product UI itself is the hero.

What not to copy: the black-plus-single-neon formula. Taken as is, it is the same default we are trying to leave. We take the discipline (hairlines, restraint, type) and put the identity somewhere else.

## 3. Direction

**Name: Trilha.** One calm workspace with one path through it. A web course has a built-in visual vocabulary that is not neon: the three languages and the page itself.

**Idea: color means content, never chrome.** Each unit gets the color students already associate with its language: HTML orange-red, CSS blue, JavaScript yellow, Dados teal, UX violet. These colors only appear as small identity marks (a dot on the path, a unit tab, a progress fill). All chrome, buttons and surfaces stay neutral. The primary action is an off-white button, so the one place the eye goes is the next step.

**The one memorable element: the trail.** A continuous, slightly curved path, drawn once, with each node as a solid disc that fills with its unit color as the student masters it. Nothing else on the page glows or moves unprompted. The rest of the design is quiet so the trail reads as the product.

### Design review against the brief (what I changed)
First draft: graphite background, a single lime accent, Duolingo-style bubbly path, pixel font kept small.
- **Lime accent: dropped.** It is the generated-design default (near-black plus acid green). Replaced by language-identity colors on a neutral base and an off-white CTA.
- **Bubbly path and mascot everywhere: dropped.** It would read as a Duolingo clone. The path stays but with solid discs and hairline connectors; Bit appears only in empty states and feedback, small.
- **Pixel font: dropped entirely**, not just shrunk. It was the loudest slop signal and not needed for identity.
- **Cursor-style cream parchment: rejected** as the other known default (cream plus serif plus warm accent).

## 4. Tokens

### Color (dark first; light theme is a later option, not v1)
| Name | Value | Role |
|---|---|---|
| Graphite | `#0F1216` | Page canvas. Cool, not navy, not pure black. |
| Panel | `#161A20` | Single raised surface level. No third level. |
| Hairline | `#262C35` | All borders and dividers, 1 px. No shadows anywhere except modals. |
| Text | `#ECEFF4` | Primary text. |
| Muted | `#8D97A6` | Secondary text. Checked at AA on Graphite and Panel (about 6.3:1). |
| Paper | `#F3F4F6` | The one primary button fill, with Graphite text. |

Unit identity colors (never for text on dark below 3:1; used for fills, rings and dots; labels on them use Graphite):
- HTML `#FF6A3D`, CSS `#4F8BFF`, JavaScript `#F4C542`, Dados e APIs `#2FC9A0`, Design e UX `#B58CFF`, Prova 2 `#FF5C8A`.
- Feedback: correct `#46C97D`, incorrect `#FF6B6B`, used for state and always paired with an icon and text, never color alone.

### Type (two families plus code)
- **Display and headings: Bricolage Grotesque** (variable, 600 to 700). Slightly quirky and organic, optical sizing, strong PT-BR diacritics. Tracking -0.02em at 28 px and above.
- **UI and body: Hanken Grotesk** (400, 500, 600). Clean and humanist, not the Inter default. 16 px body, line-height 1.5, line length under 70 characters.
- **Code: JetBrains Mono**, only inside code, never for labels.
- Self-hosted through `@fontsource-variable/*`. The pixel font is removed.
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 56. Titles are sentence case. No all-caps labels, no letter-spaced eyebrows.

### Shape and depth
- Radius: 6 px for controls and inputs, 12 px for panels, full for the path discs and progress. Nothing else.
- Depth: surface step plus hairline. No glow, no shadow (modals get one overlay and a hairline).
- Space: 8 px base, sections at 48 and 80 px.

### Motion
- Only motion that answers an action: a progress fill, a step check, a dialog open. 150 to 220 ms ease-out.
- Exactly one orchestrated moment: finishing a unit fills its color along the trail once.
- Removed: aurora background, click sparks, shiny text, floating mascot, count-up on every number. Everything honors `prefers-reduced-motion`.

## 5. Information architecture (fixes the silos)

**Three destinations instead of six:**
1. **Hoje** (home): one decision, "what next".
2. **Trilha**: the path and every node. Laboratórios live here as "Projetos" at the end of each unit they belong to.
3. **Progresso**: stats, achievements, and the review forecast.

Ajustes becomes a menu on the avatar (settings, export, import). The HUD shrinks to a single line in the header: level, today's goal as a thin bar, streak as a plain number.

**A node becomes a lesson with four steps, in one flow:**
1. **Ler**: a short primer (6 to 10 key points taken from the slides, each with its source), the missing teaching moment.
2. **Praticar**: the quiz round for the node.
3. **Fixar**: the flashcards for the node.
4. **Construir**: the code challenges.

The node page is a linear stepper with one primary button, "Continuar", that always points to the first unfinished step. Steps can be done in any order, but the default path is obvious. Completing a step feeds the next ("Você acertou 8 de 10. Vamos fixar com 6 cartas?"). The node's mastery is one ring that fills with the steps done, replacing the three stars.

**Hoje is generated from state, so modules stop being islands:**
- The primary action is the single best next step, ranked: due flashcards first, then the next unfinished step of the current node, then the recommended node.
- Below it, a compact list of 2 or 3 alternates, and today's goal as a plain sentence ("32 de 50 XP hoje").

## 6. Wireframes

Desktop 1280, content column 1040 px, header 56 px. Left aligned text, one column of reading, no centered paragraphs.

```
HOJE
+--------------------------------------------------------------+
| DIW Arcade        Hoje   Trilha   Progresso       Nv 3  ▬▬▭ 🔥4 (A)|
+--------------------------------------------------------------+
|                                                              |
|  Bom te ver de volta.                                        |
|                                                              |
|  +--------------------------------------------------------+  |
|  | Flexbox e Grid                              [ CSS ●]   |  |
|  | Falta o desafio. 2 de 4 passos.                        |  |
|  |                                [ Continuar ] (paper)   |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Também hoje                                                 |
|  ─────────────────────────────────────────────────────────   |
|  6 cartas para revisar                              Revisar  |
|  Quiz: Viewport e Media Queries                      Começar |
|                                                              |
|  32 de 50 XP hoje                                            |
+--------------------------------------------------------------+
```

```
TRILHA (the trail is the hero; one column, path curves gently)
+--------------------------------------------------------------+
|  HTML ●                                  4 de 5 nós          |
|        ◉ Sintaxe e elementos         ← filled disc, unit color|
|           ◜                                                  |
|              ◉ Formulários                                   |
|           ◝                                                  |
|        ◎ Semântica                   ← ring: in progress      |
|           ◜                                                  |
|  CSS ●                                                       |
|              ○ Introdução           ← outline: not started    |
|     (hairline connectors, one curve, no cards around nodes)  |
+--------------------------------------------------------------+
Phone: same path, full width, node title beside the disc.
```

```
NODE (a lesson)
+--------------------------------------------------------------+
| ← Trilha   Flexbox e Grid                    [ CSS ● ] ring 50%|
+--------------------------------------------------------------+
|  1 Ler  ✓ ── 2 Praticar ✓ ── 3 Fixar ● ── 4 Construir        |
|                                                              |
|  Fixar                                                       |
|  27 cartas, 6 para revisar hoje.                             |
|                                      [ Continuar ]           |
|                                                              |
|  O que você já domina                                        |
|  ─────────────────────────────────────────────────────────   |
|  display: flex   ✓     justify-content   ✓     grid-area  ○  |
+--------------------------------------------------------------+
```

```
SESSION (quiz / cards / challenge: focus mode)
+--------------------------------------------------------------+
| ✕                       ▬▬▬▬▬▭▭▭▭▭  4 de 10                  |
+--------------------------------------------------------------+
|        Qual propriedade alinha no eixo principal?            |
|        ( ) align-items    (●) justify-content   ...          |
|        ✓ Correto. justify-content age no eixo principal.     |
|        Fonte: aula 174, slide 4              [ Continuar ]   |
+--------------------------------------------------------------+
The session ends on a summary that ends in one button: the next step.
```

Challenge screen: editor left (about 45%), preview center (about 35%) with a thin browser frame, requirements right (about 20%) as a flat checklist; the result is shown inline, not in a stacked panel.

## 7. Content and copy rules

- Sentence case, plain verbs, one job per element. Buttons say what happens: "Continuar", "Revisar 6 cartas", "Executar testes".
- No tracked caps, no `A · B · C` meta strings, no `WORD — fragment` labels, no `→` on links, no numbering unless the content is a sequence (the four lesson steps and the path nodes are).
- Errors say what happened and what to do; empty states are invitations ("Nenhum cartão hoje. Que tal um desafio?"). Bit speaks only in feedback, one short line, never mocking.
- Keep the vocabulary stable across the flow: "Continuar" is both the step button and what the toast reports.

## 8. Refactor scope and phases

### Phase 0: validate the direction before touching the app (recommended)
A throwaway static prototype (HTML and CSS, no React) of the four screens above at 1280 and 375 px, with the tokens. The user reviews screenshots and approves or redirects. This is cheap and is where taste is settled. Playbook: `prototype`.

### Phase 1: foundation
- Tokens, fonts (`@fontsource-variable/bricolage-grotesque`, `hanken-grotesk`), global CSS. Remove the pixel font, aurora, click spark and shiny text.
- Primitives rebuilt to the new shape: Button, Panel, Ring, ProgressBar, Chip, Stepper, PathNode.

### Phase 2: shell and IA
- New header, bottom bar on phone, avatar menu, three routes (`/`, `/trilha`, `/progresso`), redirects from the old routes.
- Hoje with the ranked next-step selector (a pure, tested function that reuses the existing recommendation and due-card selectors).

### Phase 3: lesson flow
- Trilha path, node lesson page with the four steps, mastery ring.
- **New content:** the "Ler" primers (6 to 10 sourced key points per node, generated from the slides with evidence checked by the validator, like the rest of the content).
- Session shells and summaries chained to the next step.

### Phase 4: screens
- Challenge layout, Progresso (stats and achievements), Settings in the avatar menu, empty and error states, 404.

### Phase 5: cleanup and proof
- Delete dead code and CSS, update tests and the smoke routes, rerun the budget (should shrink: fewer effects, no pixel font).
- Screenshots before and after for every screen at both widths, reviewed by the master and the user.

### Constraints that stay
- No changes to `src/lib/storage/**`, the runner, the XP economy or content JSON structure beyond adding the primers.
- Everything keyed by node id and unit stays; the Prova 2 track and any new units pick up their color from the tree data.
- Smoke test, axe baseline at zero, budget, 452 tests stay green; test updates only for markup that changes legitimately.

## 9. Risks and open decisions

| Risk or decision | Notes |
|---|---|
| Taste can't be proven by tests | Phase 0 prototype and screenshot reviews are the sensor. Builders cannot see images. |
| Primers are new content | Needs a schema addition and about 14 to 20 content tasks, parallel and cheap, but accuracy rests on the evidence check. |
| Route changes | Old routes redirect so saved links work. The smoke and route tests need updating. |
| Language colors and contrast | Fills and rings only; text on them is Graphite; contrast tests extend the existing token test. |
| Dark only | Light theme is possible later because every color is a token. |
| Overlap with the Prova 2 content run | Independent files, but both touch `tree.ts` and the schema. Run the content run first, then this. |

Open decisions for the user: (1) approve the Trilha direction or choose another from the review above; (2) whether the lesson "Ler" primers are wanted in v1; (3) dark only or dark plus light; (4) Phase 0 prototype first (recommended) or straight to the refactor.


---

# Part 2. Approved spec and order of work


Status: approved by the user on 2026-11-13; updated the same day for the new `main` (section 10). Supersedes sections 4 to 9 of `ui-redesign-plan.md`; the diagnosis there still stands.
Reference: the approved prototype, `~/Projects/DIW-Gameplay-ui/prototype/ui-redesign/` (branch `proto/ui-redesign`, scratch, never merged). Its `NOTES.md` has tokens, contrast numbers and known issues. Screens to match are in `shots/`.

## 1. Decisions already made
- Direction **Trilha v3**: pixel-grid identity (stepped corners, dithered empty progress, 8x8 pixel sprites and icons), trail as the product, unit color means content only, off-white primary button.
- Pixel font (Pixelify Sans) only for short display titles, the brand and big numbers, never below 20 px. Body Hanken Grotesk, code JetBrains Mono.
- **Dark and light themes** from v1. Light has its own unit-color variants.
- **"Ler" primers ship in v1**: 6 to 10 sourced key points per node.
- **Homepage** (public landing) where the trail is the layout.
- Unit colors stay as in the prototype, keyed by unit id (`u1` to `u6`) in the UI token map, since `tree.ts` has no color field. Fundamentos is neutral gray; Dados e JavaScript uses the JavaScript yellow; the Dados teal stays unused.
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


---

# Part 3. Execution plan: 55 tasks in 5 rounds

The planner turned the spec into one run (`ui-redesign`) of 55 small tasks. Each task has `Allowed files`, a failing test first, a `Done when` condition and a `Proof` command; builders are limited to about 20 minutes per task. Rounds hold at most three file-disjoint tasks that can run in parallel; a task may start once its dependencies are merged.

Out of scope for the whole run (never implemented in it): fixing Escape closing both dialogs, the stale next step after the last challenge of a node, the heavy focus ring on the route error heading, lazy-loading content per node, the accessible name of the quiz code figure, the local-only GLOSSARY, hardening the snippet executor, and creating a remote repository.


**Round 0 (foundation)**

| Task | What | Depends on |
|---|---|---|
| 1 | Tokens, fonts and the pixel-font floor | None (can start immediately) |
| 2 | PixelSprite, PixelIcon and the sprite and icon grids | None (can start immediately) |
| 3 | PixelPanel, Button and ButtonLink | None (can start immediately) |
| 4 | Theme module and the Ajustes theme control | 1 |
| 5 | SegBar, Tag and unit colors | 1 |
| 6 | NodeDisc | 2 |
| 7 | Stepper | 2, 3 |
| 8 | formatSource copy | None |
| 9 | Smoke theme and route filters | 4 |

**Round 1 (shell and navigation, lesson page, primer schema and storage)**

| Task | What | Depends on |
|---|---|---|
| 10 | Storage v2 with `primersRead` (HIGH RISK) | None (round 1 by plan) |
| 11 | Header, nav and tab bar | 2, 3, 4 |
| 12 | Primer schema and validator | None |
| 13 | `primer/read` event | 10 |
| 14 | Header stat line and avatar menu | 11, 5 |
| 15 | Primer loader | 12 |
| 16 | Routes and redirects | 11 |
| 17 | lessonSteps selector | 13 |
| 18 | 404 and route error restyle | 3, 11 |
| 19 | nextStep selector | 17 |
| 20 | Lesson page (header, stepper, stage, one Continuar) | 5, 7, 16, 17 |
| 21 | Fixar stage and "O que você já domina" | 20 |
| 22 | Hoje page | 3, 5, 16, 19 |

**Round 2 (primers n01 to n20, sessions)**

| Task | What | Depends on |
|---|---|---|
| 23 | Primers n01, n02 | 12, 15 |
| 24 | Primers n11, n12 | 12, 15 |
| 25 | Session shell (focus mode) | 2, 5 |
| 26 | Primers n03, n04 | 12, 15 |
| 27 | Primers n13, n14 | 12, 15 |
| 28 | Session summary | 2, 3, 5 |
| 29 | Primers n05, n06 | 12, 15 |
| 30 | Primers n15, n16 | 12, 15 |
| 31 | Quiz session | 8, 22, 25, 28 |
| 32 | Primers n07, n08 | 12, 15 |
| 33 | Primers n17, n18 | 12, 15 |
| 34 | Cards session | 22, 25, 28 |
| 35 | Primers n09, n10 | 12, 15 |
| 36 | Primers n19, n20 | 12, 15 |
| 37 | Challenge layout | 3, 5, 25 |

**Round 3 (Ler view, landing, Trilha)**

| Task | What | Depends on |
|---|---|---|
| 38 | Require primers | 23, 24, 26, 27, 29, 30, 32, 33, 35, 36 |
| 39 | Trail geometry | 17, 19 |
| 40 | PrimerView | 2, 3, 5, 8, 15 |
| 41 | Ler step wiring | 13, 20, 40 |
| 42 | Trilha page | 5, 6, 16, 22, 39 |
| 43 | Landing page markup | 2, 3, 5, 6 |
| 44 | Landing routing | 16, 43 |
| 45 | Projetos on the trail and collapse or expand | 42 |

**Round 4 (cleanup and proof)**

| Task | What | Depends on |
|---|---|---|
| 46 | Progresso restyle | 3, 5, 16 |
| 47 | Ajustes restyle | 3, 4, 10 |
| 48 | Boas-vindas restyle | 2, 3 |
| 49 | Lab guides restyle and LabsPage removal | 45 |
| 50 | Delete effects, count-ups and the old HUD | 14, 28, 31, 34 |
| 51 | Fonts swap | 1, 46, 47, 48, 49 |
| 52 | Delete Mascot, StarRating, ProgressRing and ProgressBar | 18, 21, 28, 31, 34, 37, 46, 47, 48, 49 |
| 54 | Legacy tokens: prune and alias | 50, 51 |
| 53 | Delete Card, Panel, Badge and the old tree files | 42, 52 |
| 55 | Proof: both-theme smoke, screenshots and budget record | 44, 53, 54 |

Conventions for every task: the proof ends with `scripts/check` exiting 0; markup, CSS and sprite grids are copied from the prototype reference and ported to plain per-component CSS; the failing test is committed first; unit colors are keyed by unit id (`u1` to `u6`).

Sensors: `scripts/check` (npm ci, lint, typecheck, vitest, `validate:content`, build, smoke at both widths, smoke self-test, budget); content evidence checked with `DIW_SOURCES` and `DIW_REPO` for the primer tasks; per-route axe and overflow smoke in both themes; screenshots of every screen at 1280 and 375 px in both themes. Visual fidelity, screen-reader experience and the factual accuracy of the primers need human or reviewer eyes.

---

# Part 4. Status, prototype and how the work runs

## Prototype
The approved static prototype (v4) is HTML and CSS only, never merged. It lives on the local scratch branch `proto/ui-redesign` under `prototype/ui-redesign/` (index.html, app.css, tokens.css, theme.js, NOTES.md and screenshots at 1280x800 and 375x812 in both themes). A copy used as the build reference is on the run branch under `docs/prototype-ref/` and is deleted by the cleanup tasks.

## Status (2026-11-13, superseded by Part 5)
The run described here was paused. The redesign was rebuilt as the v4 run on `feat/ui-refactor-v4`; see Part 5 for what shipped. The list below is the state at the pause.

- Run branch: `feat/ui-redesign`, paused on request. Merged so far: tasks 1 (tokens, fonts, pixel-font floor), 2 (pixel sprites and icons), 3 (panel and button primitives) and 8 (source label copy), plus a lint-ignore for the prototype reference copy.
- Stopped mid-work, branches intact: tasks 4 (theme module), 5 (segmented bar, tag, unit colors) and 12 (primer schema). Their final checks had not finished.
- Not started: the other 45 tasks, including task 10 (storage with `primersRead`, high risk).
- `main` does not contain any of it.

## How the work runs
- One maestro run, one worktree per task, merged into the run branch by the master; merging into `main` happens only after the whole run is green.
- Builders: up to three at a time. Reviewers: one review per round after `maestro check` passes. Fix rounds: at most two per task.
- Primer content tasks need the slide texts and the course repository outside this repo (`DIW_SOURCES`, `DIW_REPO`); course PDFs and Canvas data are never committed.
- Quality bar for every task: lint, typecheck, tests, `validate:content`, build, smoke, axe at zero and the bundle budget stay green; PT-BR copy; keyboard navigation; `prefers-reduced-motion` honored.

# Part 5. v4 delta: build to the prototype

Run `ui-refactor-to-prototype-v4`. Every screen was rebuilt to match the static prototype at `~/Projects/ui-redesign` (its `shots/` folder is the visual reference). Behavior, storage, the reducer, SRS, XP math, the runner and routes did not change.

## Decisions
- Fonts: tokens are `--font-px` (Pixelify Sans, 20px and up), `--font-body` and `--font-code`. The `--font-display` and `--font-mono` aliases are gone, and `tokens.test.ts` asserts they stay undefined. `pixelFont.test.ts` still guards the 20px floor.
- Theme: `ThemeToggle` is the only theme control (44px, label "Alternar tema claro e escuro"). The only storage key is `diw-theme`.
- Shell: one `nav aria-label="Principal"` (Hoje, Trilha, Progresso); a tab bar below 720px. Nav stays active on `/no/*`.
- Unit rename: "Fundamentos da Web" is now "Fundamentos" (user decision).
- Lab placement: lab links left the Trilha. Each lab shows as a "Projetos da unidade" row in the Construir panel of every node in the lab's unit (lab-01 on CSS; lab-02, lab-03 and jsonserver on unit 5). A test checks every `LAB_ID` stays reachable.
- Toast offset: `Toast` sits above the feedback bar through `--feedback-bar-h`; its close button has a 44px hit area.
- Fill-in questions keep a "Responder" submit button; Enter also submits.
- Touch targets: the harness fails any target under 44px.

## Accepted deviations from `shots/`
1. Real content and numbers instead of mock data.
2. Trilha shows every unit expanded; there is no collapsed "concluida" line.
3. Desafio keeps a session bar above the title and is not full-bleed.
4. Desafio uses a dark editor in the light theme, a deliberate fix for axe contrast.
5. Resumo shows the first-try score, not the prototype's "10 de 10" label.
6. The HUD keeps a daily-goal chip the prototype lacks.
7. The avatar is a real menu.
8. Screens the prototype lacks (Progresso, Ajustes, 404, RouteError, Flashcards, Onboarding, Lab guide) are extrapolated from its tokens and primitives.

## Known deviations and loose ends
- Hoje rows carry a trailing route icon the prototype does not have.
- Some Continuar buttons lack the play icon (`ButtonLink` TODO).
- `BIT_LINES` keys `correct`, `wrong` and `sessionDone` are dead copy, left in place.
- `src/features/runner/SandboxFrame.css` still reads `--font-mono`. The runner is frozen, so a one-rule (0,2,0) override of the runner box in `src/styles/global.css` (`.sandbox-frame .sandbox-frame__report`) supplies the code font; it must out-rank the runner's (0,1,0) rule, which loads later. AC15 is waived for that one line. Remove both when the runner may change.
- The legacy v2 aliases in `theme.css` (`--surface`, `--border`, `--text-muted`, `--accent` and the rest) are all still referenced, so none were removed.

## Screenshot harness
`npm run build && npm run screenshots -- --proto` writes 72 prototype-named PNGs (9 screens, desktop and phone, both themes, plus quiz states) to `SHOTS_DIR`. Use `--only <screen>` for one screen, and run one screen per run. The run also prints a touch-target scan; every `alvos<44px` line must be 0.
