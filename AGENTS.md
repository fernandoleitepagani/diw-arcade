# Project agent contract

## What this project is

DIW Arcade: a gamified, PT-BR, local-only practice site for "Desenvolvimento de Interfaces Web" (PUC Minas).
Skill tree, quizzes, spaced-repetition flashcards, in-browser code challenges, project guides, stats.
Content is typed JSON generated from the course PDFs; each item cites its source slide.

## Stack

- Language: TypeScript (strict), React 19, Vite
- Package manager: npm
- Commands: `lint=npm run lint` `typecheck=npm run typecheck` `test=npm test -- --run` `content=npm run validate:content` `build=npm run build`
- Conventions: feature folders under `src/`, plain CSS per component, CodeMirror 6 editor, sandboxed iframe runner,
  progress in localStorage (versioned schema), content in `src/content/**.json` validated by a schema. No backend.

## Gotchas

- Never commit course PDFs or Canvas data; content cites slides but does not embed the PDFs.
- All user-facing copy is PT-BR.
- Respect `prefers-reduced-motion`; everything keyboard-navigable.
