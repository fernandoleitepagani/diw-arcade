import type {
  Challenge,
  Flashcard,
  LabGuide,
  Question,
} from '../content/schema';

/** Slide 1 is the cover; slide 2 carries every fixture evidence excerpt. */
export const fixtureAulaSlides: readonly string[] = [
  'Aula 172 — Propriedades CSS',
  [
    'A cor de fundo é definida pela propriedade background-color em CSS.',
    'A propriedade color define a cor do texto de um elemento.',
    'O seletor de classe começa com um ponto e aplica estilos a vários elementos.',
    'A propriedade font-size controla o tamanho da fonte do texto.',
    'A propriedade margin define o espaço externo de um elemento.',
    'A propriedade padding define o espaço interno de um elemento.',
    'O modelo de caixa soma conteúdo, padding, borda e margem.',
    'A propriedade display altera o fluxo do elemento na página.',
  ].join(' '),
];

/** Slide 1 is the cover; slide 2 carries the TIAW evidence excerpt. */
export const fixtureTiawSlides: readonly string[] = [
  'TIAW — Estruturas de Dados e JSON',
  [
    'JSON é um formato de texto para troca de dados entre sistemas.',
    'Um objeto JSON usa chaves e valores separados por dois-pontos.',
  ].join(' '),
];

/** One slide: the orientation file has no form feeds. */
export const fixtureOrientacaoText = [
  'Prova 2 — orientações',
  'A prova tem questões de leitura de código e questões práticas.',
].join(' ');

/** Repo source lines for the line-range evidence tests. */
export const fixtureRepoLines: readonly string[] = [
  'const total = 0;',
  'total += 1;',
  'console.log(total);',
  'const outro = 2;',
];

/** Slide 2 holds the rubric sentences quoted by the lab requirements. */
export const fixtureLabSlides: readonly string[] = [
  'Laboratório 01 — Página de tarefas',
  [
    'Crie uma página com uma lista de tarefas.',
    'Use uma lista não ordenada com pelo menos três itens.',
    'Aplique uma cor de fundo ao cabeçalho.',
    'Inclua um formulário com um campo de texto.',
    'Valide o formulário com JavaScript antes de enviar.',
    'Publique o projeto no repositório da disciplina.',
  ].join(' '),
];

const source = { aula: 172, slide: 2 } as const;

export const fixtureQuestions: Question[] = [
  {
    id: 'n07-q001',
    nodeId: 'n07',
    type: 'mcq',
    prompt: 'Qual propriedade define a cor do texto de um elemento?',
    options: ['color', 'background-color', 'font-size', 'margin'],
    answer: 0,
    explanation: 'A propriedade color atua diretamente na cor do texto.',
    source,
    evidence: 'A propriedade color define a cor do texto de um elemento.',
  },
  {
    id: 'n07-q002',
    nodeId: 'n07',
    type: 'mcq',
    prompt: 'Qual propriedade define a cor de fundo de uma caixa?',
    options: ['color', 'background-color', 'display', 'padding'],
    answer: 1,
    explanation: 'O fundo é pintado com background-color, e não com a cor do texto.',
    source,
    evidence: 'A cor de fundo é definida pela propriedade background-color em CSS.',
  },
  {
    id: 'n07-q003',
    nodeId: 'n07',
    type: 'mcq',
    prompt: 'O que o ponto no início de um seletor representa?',
    options: ['Um id', 'Uma tag', 'Uma classe', 'Um atributo'],
    answer: 2,
    explanation: 'O ponto seleciona uma classe e pode atingir vários elementos.',
    source,
    evidence:
      'O seletor de classe começa com um ponto e aplica estilos a vários elementos.',
  },
  {
    id: 'n07-q004',
    nodeId: 'n07',
    type: 'mcq',
    prompt: 'Qual propriedade controla o tamanho da fonte do texto?',
    options: ['color', 'font-size', 'line-height', 'margin'],
    answer: 1,
    explanation: 'A propriedade font-size define o tamanho dos caracteres.',
    source,
    evidence: 'A propriedade font-size controla o tamanho da fonte do texto.',
  },
  {
    id: 'n07-q005',
    nodeId: 'n07',
    type: 'mcq',
    prompt: 'Qual propriedade define o espaço externo de um elemento?',
    options: ['padding', 'border', 'width', 'margin'],
    answer: 3,
    explanation: 'A margem fica do lado de fora e afasta o elemento dos vizinhos.',
    source,
    evidence: 'A propriedade margin define o espaço externo de um elemento.',
  },
  {
    id: 'n07-q006',
    nodeId: 'n07',
    type: 'mcq',
    prompt: 'Qual propriedade define o espaço interno de um elemento?',
    options: ['margin', 'padding', 'display', 'border'],
    answer: 1,
    explanation: 'O padding ocupa o espaço entre o conteúdo e a borda.',
    source,
    evidence: 'A propriedade padding define o espaço interno de um elemento.',
  },
  {
    id: 'n07-q007',
    nodeId: 'n07',
    type: 'tf',
    prompt: 'A propriedade margin define o espaço interno de um elemento.',
    answer: false,
    explanation: 'A margem é externa; o espaço interno pertence ao padding.',
    source,
    evidence: 'A propriedade margin define o espaço externo de um elemento.',
  },
  {
    id: 'n07-q008',
    nodeId: 'n07',
    type: 'tf',
    prompt: 'O modelo de caixa soma conteúdo, padding, borda e margem.',
    answer: true,
    explanation: 'Essas quatro camadas formam o modelo de caixa do CSS.',
    source,
    evidence: 'O modelo de caixa soma conteúdo, padding, borda e margem.',
  },
  {
    id: 'n07-q009',
    nodeId: 'n07',
    type: 'tf',
    prompt: 'A propriedade display altera o fluxo do elemento na página.',
    answer: true,
    explanation: 'O display escolhe como o elemento participa do fluxo do layout.',
    source,
    evidence: 'A propriedade display altera o fluxo do elemento na página.',
  },
  {
    id: 'n07-q010',
    nodeId: 'n07',
    type: 'fill',
    prompt: 'A propriedade ____ define a cor do texto de um elemento.',
    answers: ['color'],
    explanation: 'A palavra color completa a propriedade que pinta o texto.',
    source,
    evidence: 'A propriedade color define a cor do texto de um elemento.',
  },
  {
    id: 'n07-q011',
    nodeId: 'n07',
    type: 'fill',
    prompt: 'A propriedade ____ define o espaço interno de um elemento.',
    answers: ['padding'],
    explanation: 'O padding preenche o interior da caixa até a borda.',
    source,
    evidence: 'A propriedade padding define o espaço interno de um elemento.',
  },
  {
    id: 'n07-q012',
    nodeId: 'n07',
    type: 'fill',
    prompt: 'A propriedade ____ altera o fluxo do elemento na página.',
    answers: ['display'],
    explanation: 'A propriedade display muda como a caixa ocupa o fluxo.',
    source,
    evidence: 'A propriedade display altera o fluxo do elemento na página.',
  },
];

export const fixtureFlashcards: Flashcard[] = [
  {
    id: 'n07-f001',
    nodeId: 'n07',
    front: 'O que a propriedade color controla?',
    back: 'A cor do texto de um elemento.',
    source,
    evidence: 'A propriedade color define a cor do texto de um elemento.',
  },
  {
    id: 'n07-f002',
    nodeId: 'n07',
    front: 'O que a propriedade background-color controla?',
    back: 'A cor de fundo de uma caixa.',
    source,
    evidence: 'A cor de fundo é definida pela propriedade background-color em CSS.',
  },
  {
    id: 'n07-f003',
    nodeId: 'n07',
    front: 'Como se escreve um seletor de classe?',
    back: 'Com um ponto antes do nome da classe.',
    source,
    evidence:
      'O seletor de classe começa com um ponto e aplica estilos a vários elementos.',
  },
  {
    id: 'n07-f004',
    nodeId: 'n07',
    front: 'O que a propriedade font-size controla?',
    back: 'O tamanho da fonte do texto.',
    source,
    evidence: 'A propriedade font-size controla o tamanho da fonte do texto.',
  },
  {
    id: 'n07-f005',
    nodeId: 'n07',
    front: 'Qual é a diferença entre margin e padding?',
    back: 'A margem é externa à caixa e o padding é interno.',
    source,
    evidence: 'A propriedade padding define o espaço interno de um elemento.',
  },
  {
    id: 'n07-f006',
    nodeId: 'n07',
    front: 'Quais camadas o modelo de caixa soma?',
    back: 'O modelo soma conteúdo, padding, borda e margem.',
    source,
    evidence: 'O modelo de caixa soma conteúdo, padding, borda e margem.',
  },
];

export const fixtureChallenge: Challenge = {
  id: 'n07-c01',
  nodeId: 'n07',
  title: 'Destaque o cartão',
  kind: 'css',
  goal: 'Deixe o cartão com o fundo escuro e mantenha o título visível.',
  starter: {
    html: '<div class="cartao"><h1>Olá</h1></div>',
    css: '.cartao { padding: 8px; }',
    js: '',
  },
  solution: {
    html: '<div class="cartao"><h1>Olá</h1></div>',
    css: '.cartao { background-color: #0a1128; padding: 8px; }',
    js: '',
  },
  requirements: [
    {
      id: 'fundo-escuro',
      label: 'O cartão usa o fundo escuro.',
      check: {
        kind: 'style',
        selector: '.cartao',
        prop: 'background-color',
        match: { pattern: '#0a1128' },
      },
    },
    {
      id: 'titulo-visivel',
      label: 'O título continua presente.',
      check: { kind: 'text', selector: 'h1', match: { equals: 'Olá' } },
    },
  ],
  hints: [
    'Pense em uma propriedade que pinta o fundo.',
    'Aplique a regra ao seletor de classe do cartão.',
    'O valor do fundo começa com #0a1128.',
  ],
  source,
  evidence: 'A cor de fundo é definida pela propriedade background-color em CSS.',
};

export const fixtureLab: LabGuide = {
  id: 'lab-01',
  title: 'Laboratório 01 — Página de tarefas',
  summary: 'Uma página simples de lista de tarefas com formulário e estilo próprio.',
  repoUrl:
    'https://github.com/joaopauloaramuni/desenvolvimento-de-interfaces-web/tree/main/LABORATORIOS/LAB01',
  repoPaths: ['LABORATORIOS/LAB01/index.html', 'LABORATORIOS/LAB01/style.css'],
  requirements: [
    {
      text: 'Crie uma página com uma lista de tarefas.',
      source: { lab: 1, slide: 2 },
      evidence: 'Crie uma página com uma lista de tarefas.',
    },
    {
      text: 'Use uma lista não ordenada com pelo menos três itens.',
      source: { lab: 1, slide: 2 },
      evidence: 'Use uma lista não ordenada com pelo menos três itens.',
    },
    {
      text: 'Aplique uma cor de fundo ao cabeçalho.',
      source: { lab: 1, slide: 2 },
      evidence: 'Aplique uma cor de fundo ao cabeçalho.',
    },
  ],
  tips: {
    html: ['Use a tag ul para a lista de tarefas.'],
    css: ['Escolha uma cor de fundo com bom contraste.'],
    js: ['Leia o valor do campo antes de validar.'],
  },
  steps: [
    {
      id: 'estrutura',
      title: 'Crie a estrutura da página',
      body: 'Monte o documento HTML com o cabeçalho e a área principal.',
      checklist: ['Título da página', 'Cabeçalho com o nome do projeto'],
      code: {
        lang: 'html',
        text: '<header><h1>Minhas tarefas</h1></header>',
      },
      repoPath: 'LABORATORIOS/LAB01/index.html',
    },
    {
      id: 'lista',
      title: 'Adicione a lista de tarefas',
      body: 'Inclua uma lista não ordenada com pelo menos três itens.',
      checklist: ['Três itens na lista'],
    },
    {
      id: 'estilo',
      title: 'Estilize o cabeçalho',
      body: 'Aplique uma cor de fundo ao cabeçalho e garanta contraste no texto.',
      code: { lang: 'css', text: 'header { background-color: #1a2547; }' },
      repoPath: 'LABORATORIOS/LAB01/style.css',
    },
    {
      id: 'formulario',
      title: 'Inclua o formulário',
      body: 'Adicione um campo de texto e um botão para criar tarefas.',
    },
    {
      id: 'publicacao',
      title: 'Publique no repositório',
      body: 'Coloque os arquivos na pasta do laboratório e envie o commit.',
      code: { lang: 'bash', text: 'git add . && git commit -m "lab 01"' },
      repoPath: 'LABORATORIOS/LAB01',
    },
  ],
};

/** Path-keyed content, matching what the validator receives. */
export const fixtureContent: Record<string, unknown> = {
  'src/content/n07/questions.json': fixtureQuestions,
  'src/content/n07/flashcards.json': fixtureFlashcards,
  'src/content/n07/challenges.json': [fixtureChallenge],
  'src/content/labs/lab-01.json': fixtureLab,
};
