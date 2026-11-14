export type ProtoState = 'quiz' | 'quiz-erro' | 'resumo';

export interface ProtoScreen {
  screen: string;
  path: string;
  persona: 'fresh' | 'mid';
  state?: ProtoState;
}

/** As nove telas do protótipo, com a rota e a persona de cada uma. */
export const PROTO_SCREENS: ProtoScreen[] = [
  { screen: 'index', path: '/', persona: 'fresh' },
  { screen: 'hoje', path: '/hoje', persona: 'mid' },
  { screen: 'trilha', path: '/trilha', persona: 'mid' },
  { screen: 'licao', path: '/no/n09', persona: 'mid' },
  { screen: 'ler', path: '/no/n09?passo=ler', persona: 'mid' },
  { screen: 'quiz', path: '/no/n09/quiz', persona: 'mid', state: 'quiz' },
  { screen: 'quiz-erro', path: '/no/n09/quiz', persona: 'mid', state: 'quiz-erro' },
  { screen: 'resumo', path: '/no/n09/quiz', persona: 'mid', state: 'resumo' },
  { screen: 'desafio', path: '/desafio/n09-c01', persona: 'mid' },
];

export function protoShotName(
  viewport: { width: number },
  theme: string,
  screen: string,
  full: boolean,
): string {
  const device = viewport.width < 600 ? 'phone' : 'desk';
  return `${device}-${theme}-${screen}${full ? '-full' : ''}.png`;
}

export function filterScreens(only?: string): ProtoScreen[] {
  return only === undefined
    ? PROTO_SCREENS
    : PROTO_SCREENS.filter((s) => s.screen === only);
}
