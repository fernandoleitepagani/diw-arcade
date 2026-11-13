export type ProbeKind = 'quiz' | 'flashcard';

export interface SmokeRoute {
  path: string;
  label: string;
  /** `fresh` deixa a rota decidir pelo primeiro acesso em vez de pular o onboarding. */
  seed?: 'fresh';
  /** Interação obrigatória depois que o `main h1` aparece. */
  probe?: ProbeKind;
}

/** Rotas percorridas pelo smoke de navegador, na ordem em que rodam. */
export const SMOKE_ROUTES: readonly SmokeRoute[] = [
  { path: '/hoje', label: 'hoje' },
  { path: '/trilha', label: 'trilha' },
  { path: '/no/n01', label: 'nó' },
  { path: '/no/n01/quiz', label: 'quiz', probe: 'quiz' },
  { path: '/no/n01/cartas', label: 'cartas do nó', probe: 'flashcard' },
  { path: '/no/n15', label: 'nó Prova 2' },
  { path: '/no/n15/quiz', label: 'quiz Prova 2', probe: 'quiz' },
  { path: '/desafio/n19-c01', label: 'desafio fetch' },
  { path: '/revisao', label: 'revisão' },
  { path: '/desafio/n01-c01', label: 'desafio' },
  { path: '/laboratorios/lab-01', label: 'laboratório' },
  { path: '/progresso', label: 'progresso' },
  { path: '/ajustes', label: 'ajustes' },
  { path: '/boas-vindas', label: 'boas-vindas', seed: 'fresh' },
  { path: '/caminho-inexistente', label: 'não encontrada' },
];

/** Larguras de desktop e de celular. */
export const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'celular', width: 375, height: 812 },
] as const;

export type Viewport = (typeof VIEWPORTS)[number];

/** Uma violação de acessibilidade já conhecida, identificada por rota e regra. */
export interface SmokeViolation {
  route: string;
  rule: string;
}

/** A baseline guarda pares rota+regra; a mesma regra continua falhando nas demais rotas. */
export function isBaselined(
  violation: SmokeViolation,
  baseline: readonly SmokeViolation[],
): boolean {
  return baseline.some(
    (entry) => entry.route === violation.route && entry.rule === violation.rule,
  );
}

export type FindingKind =
  | 'root-vazio'
  | 'h1-ausente'
  | 'console'
  | 'pageerror'
  | 'http'
  | 'overflow'
  | 'axe'
  | 'interacao';

export interface Finding {
  kind: FindingKind;
  detail: string;
}

export interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: number;
}

export interface OverflowMetrics {
  scrollWidth: number;
  clientWidth: number;
}

/**
 * Operações que a checagem de uma rota precisa. O smoke implementa com
 * Playwright; os testes usam um harness em memória para fixar a ordem.
 */
export interface RoutePage {
  /** `#root` sem conteúdo renderizado. */
  isRootBlank(): Promise<boolean>;
  /** Espera o `main h1` aparecer; false quando ele nunca aparece. */
  waitForHeading(): Promise<boolean>;
  /** Largura do documento depois que a rota renderizou. */
  measureOverflow(): Promise<OverflowMetrics>;
  runAxe(): Promise<readonly AxeViolation[]>;
  /** Executa a interação da rota; devolve o detalhe da falha ou null. */
  probeInteraction(kind: ProbeKind): Promise<string | null>;
  /** Console, pageerror e HTTP acumulados até este ponto. */
  collectErrors(): Promise<Finding[]>;
}

export interface RouteCheckResult {
  failures: Finding[];
  baselined: number;
}

const MAX_OVERFLOW_PX = 1;

/**
 * Ordem da checagem: primeiro o root, depois o `main h1`; só com a rota
 * renderizada medimos overflow, rodamos axe e fazemos a sondagem de interação.
 * Erros de console/página só são lidos no fim, depois do axe.
 */
export async function checkRoutePage(
  route: SmokeRoute,
  page: RoutePage,
  baseline: readonly SmokeViolation[],
): Promise<RouteCheckResult> {
  const failures: Finding[] = [];
  let baselined = 0;

  const blank = await page.isRootBlank();
  if (blank) {
    failures.push({
      kind: 'root-vazio',
      detail: '#root sem conteúdo renderizado',
    });
  } else if (!(await page.waitForHeading())) {
    failures.push({
      kind: 'h1-ausente',
      detail: 'main h1 não apareceu na página renderizada',
    });
  } else {
    const overflow = await page.measureOverflow();
    if (overflow.scrollWidth > overflow.clientWidth + MAX_OVERFLOW_PX) {
      failures.push({
        kind: 'overflow',
        detail: `${overflow.scrollWidth}px de largura para ${overflow.clientWidth}px de viewport`,
      });
    }

    for (const violation of await page.runAxe()) {
      if (violation.impact !== 'serious' && violation.impact !== 'critical') {
        continue;
      }
      const known = { route: route.path, rule: violation.id };
      if (isBaselined(known, baseline)) {
        baselined += 1;
        continue;
      }
      failures.push({
        kind: 'axe',
        detail: `${violation.id} (${violation.impact}) — ${violation.help} em ${violation.nodes} nó(s)`,
      });
    }

    if (route.probe !== undefined) {
      const detail = await page.probeInteraction(route.probe);
      if (detail !== null) {
        failures.push({ kind: 'interacao', detail });
      }
    }
  }

  // A leitura fica no fim de propósito: o que o console emitir durante o axe
  // também precisa entrar na conta.
  for (const finding of await page.collectErrors()) {
    failures.push(finding);
  }

  return { failures, baselined };
}
