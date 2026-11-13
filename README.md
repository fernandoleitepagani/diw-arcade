# DIW Arcade

Site local de prática gamificada para **Desenvolvimento de Interfaces Web**
(PUC Minas). Árvore de habilidades, quiz, flashcards com repetição espaçada,
desafios de código executados no navegador, laboratórios, estatísticas e
progresso salvo em `localStorage`. Todo o texto da interface é em PT-BR.

## Requisitos

- Node.js 20 ou mais recente
- npm

## Rodar

```bash
npm ci
npm run dev
```

O Vite mostra o endereço local (por padrão, `http://localhost:5173`).

## Testar

```bash
npm run lint        # ESLint, incluindo as regras de storage e rede
npm run typecheck   # TypeScript estrito
npm test -- --run   # Vitest, uma passada
npm run validate:content
npm run build
scripts/check       # roda tudo acima em sequência
```

`scripts/check` é o portão único: instala as dependências, roda lint,
typecheck, testes, validação de conteúdo e build. Ele só sai com `0` quando o
branch está pronto para revisão.

## Conteúdo

O conteúdo fica em `src/content/`: `n01` a `n20`, cada um com `questions.json`,
`flashcards.json` e `challenges.json`, mais `labs/*.json`. Os 20 nós formam seis
unidades; a última, **Unidade 6 · Prova 2**, reúne `n15`–`n20`: leitura de
código, tipos e coerção, DOM e eventos, URLs e parâmetros, assíncrono com
`fetch` e formulários. O validador confere schema, ids, fontes, mínimos, regras
dos laboratórios, executa a solução de referência e o código inicial de cada
desafio e prova as questões com `code` (veja abaixo).

`npm run validate:content` roda em **modo estrito** (`--require-all`): exige os
20 nós e os 4 laboratórios, e sai com erro se qualquer arquivo faltar.

### Evidências

Cada item cita uma fonte e traz uma evidência verbatim. Há quatro formas de
fonte:

- **aula** — o formato legado `{ "aula": 172, "slide": 2 }`, conferido contra
  `aula-NNN.txt`.
- **tiaw** — `{ "kind": "tiaw", "doc": "tiaw-json", "slide": 2 }`, conferido
  contra `tiaw-*.txt`.
- **orientacao** — `{ "kind": "orientacao" }`, conferido contra
  `orientacao-prova2.txt`.
- **repo** — `{ "kind": "repo", "path": "PROJETOS/.../app.js", "startLine": 10,
  "endLine": 24 }`, conferido contra o arquivo real do repositório da
  disciplina. O caminho precisa começar com `PROJETOS/` e o intervalo não pode
  passar de 80 linhas.

Aponte `DIW_SOURCES` para a pasta com os textos das aulas, dos TIAW e da
orientação, e `DIW_REPO` para a raiz do repositório da disciplina:

```bash
DIW_SOURCES=/caminho/fora/do/repo/sources \
DIW_REPO=/caminho/fora/do/repo/desenvolvimento-de-interfaces-web \
npm run validate:content
```

A saída mostra `evidence: verified N/N` (aula, tiaw e orientação),
`repo evidence: verified N/N` (código do repositório) e `code: verified N/N`
(questões executadas). Sem `DIW_SOURCES` ou `DIW_REPO`, o validador imprime
`skipped` naquela linha e não confere aquelas evidências.

### Questões executadas

Perguntas de múltipla escolha e de preenchimento podem trazer `code` e
`expected` juntos:

- **`code`** descreve o trecho: `env` é `js` ou `dom` e `source` guarda o
  JavaScript. Em `dom`, aceita também `html` (sem `<script`), `url`
  (`https://`) e `mocks` de `fetch` indexados pela URL exata.
- **`expected`** é a saída exata que o trecho imprime.

O validador roda o trecho duas vezes em um worker isolado, sem `process`,
`require`, `import`, `eval` ou rede. Timeout, erro, saída não determinística ou
saída diferente de `expected` reprovam o conteúdo, e a mensagem mostra o valor
real:

```text
saída real difere de expected: real="..." esperado="..."
```

Para `mcq`, a opção marcada precisa ser exatamente `expected`; para `fill`,
`expected` não pode ter quebra de linha e precisa constar de `answers`. A linha
`code: verified N/N` conta essas questões, e cada nó da Prova 2 exige um mínimo
delas. **Nunca adivinhe `expected`:** rode o validador e copie a saída real.

Para validar só um nó, ou um tipo de arquivo dele, use `--only`
(`questions`, `flashcards` ou `challenges`):

```bash
npx tsx scripts/validate-content.ts --only n15
npx tsx scripts/validate-content.ts --only n15/questions
```

Com `DIW_SOURCES` e `DIW_REPO` definidos, os totais de evidência e de código
saem apenas para o recorte escolhido.

**Nunca faça commit das fontes, dos PDFs ou dos dados do Canvas.** Essa pasta
fica fora do repositório e é somente leitura. O `.gitignore` já bloqueia PDFs e
arquivos compactados.

## Editor de código

Dois atalhos valem em todos os desafios:

- **Ctrl+Enter** (Cmd+Enter no macOS) executa os testes.
- **Esc e depois Tab** sai do editor: depois do Esc, o próximo Tab ou Shift+Tab
  devolve o foco à página em vez de indentar.

## Regra do baralho inteiro

O botão **"Adicionar baralho inteiro"** de um nó introduz de uma vez todas as
cartas ainda não vistas daquele baralho. Como a escolha é explícita, ela
ignora o limite diário de cartas novas e não rende XP. As cartas continuam
contando no total de novas do dia, o que reduz a cota normal de outros nós;
revisá-las depois é uma revisão comum (5 XP).

## Deploy

O build é estático:

```bash
npm run build   # gera dist/
npm run preview # confere o build localmente
```

Na Vercel, use o preset **Vite**: build `npm run build` e diretório de saída
`dist`. O `vercel.json` configura o rewrite da SPA
(`/(.*)` → `/index.html`), para que links profundos como `/no/n07` funcionem, e
envia `X-Content-Type-Options: nosniff` e `Referrer-Policy: no-referrer`.

Não há cabeçalho `Content-Security-Policy` na página: o `srcdoc` do sandbox de
desafios herda a CSP do pai, e uma política restritiva bloquearia o harness e o
script do próprio aluno. O isolamento é feito por iframe
(`sandbox="allow-scripts"`) e pela CSP interna de cada `srcdoc`. Veja
`docs/adr/0001-sandbox-runner.md`.

## Créditos

Conteúdo e laboratórios baseados no repositório da disciplina do professor
[João Paulo Aramuni](https://github.com/joaopauloaramuni/desenvolvimento-de-interfaces-web).
O DIW Arcade não distribui os PDFs nem os dados originais do curso.
