export interface SmokeRoute {
  path: string;
  label: string;
  /** `fresh` deixa a rota decidir pelo primeiro acesso em vez de pular o onboarding. */
  seed?: 'fresh';
}

/** Rotas percorridas pelo smoke de navegador, na ordem em que rodam. */
export const SMOKE_ROUTES: readonly SmokeRoute[] = [
  { path: '/', label: 'árvore' },
  { path: '/no/n01', label: 'nó' },
  { path: '/no/n01/quiz', label: 'quiz' },
  { path: '/no/n01/cartas', label: 'cartas do nó' },
  { path: '/revisao', label: 'revisão' },
  { path: '/desafio/n01-c01', label: 'desafio' },
  { path: '/laboratorios', label: 'laboratórios' },
  { path: '/laboratorios/lab-01', label: 'laboratório' },
  { path: '/estatisticas', label: 'estatísticas' },
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
