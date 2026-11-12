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

O conteúdo fica em `src/content/`: `n01` a `n14`, cada um com `questions.json`,
`flashcards.json` e `challenges.json`, mais `labs/*.json`. O validador confere
schema, ids, fontes, mínimos, regras dos laboratórios e executa a solução de
referência e o código inicial de cada desafio.

`npm run validate:content` roda em **modo estrito** (`--require-all`): exige os
14 nós e os 4 laboratórios, e sai com erro se qualquer arquivo faltar.

### Evidências e `DIW_SOURCES`

Cada item cita uma aula e um slide e traz uma evidência verbatim. Para conferir
que a evidência existe no slide, aponte `DIW_SOURCES` para a pasta com os
arquivos de texto das aulas e laboratórios (`aula-NNN.txt` e `lab-0N.txt`):

```bash
DIW_SOURCES=/caminho/fora/do/repo/sources npm run validate:content
```

A saída mostra `evidence: verified N/N`. Sem `DIW_SOURCES`, o validador imprime
`evidence: skipped (DIW_SOURCES not set)` e não confere as evidências.

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
