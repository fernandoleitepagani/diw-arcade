export type BitContext =
  | 'welcome'
  | 'correct'
  | 'wrong'
  | 'challengePass'
  | 'levelUp'
  | 'streak'
  | 'empty';

export const BIT_LINES: Record<BitContext, readonly string[]> = {
  welcome: [
    'Oi! Eu sou o Bit. Vamos montar seu caminho em Desenvolvimento de Interfaces Web?',
    'Bem-vindo! Escolha um objetivo e a gente começa juntos.',
    'Cheguei! Vamos aprender a construir interfaces com você.',
    'Pronto para começar? Cada passo deixa seu mapa mais completo.',
  ],
  correct: [
    'Mandou bem! Mais um bloco no lugar.',
    'Isso! Você acertou e o caminho ficou mais claro.',
    'Boa! Esse conceito já é seu.',
    'Exatamente! Continue assim e a trilha abre.',
  ],
  wrong: [
    'Quase! Dá uma olhada na explicação e tenta de novo.',
    'Tudo bem errar: leia a explicação com calma e tente de novo.',
    'Não foi dessa vez, mas você está aprendendo. Bora de novo?',
    'Calma, faz parte. Reveja a dica e siga em frente.',
  ],
  challengePass: [
    'Código no ar! Você cumpriu todos os requisitos.',
    'Desafio concluído! Seu código passou em tudo.',
    'Funcionou! Você transformou a ideia em algo real.',
    'Mandou bem! O navegador ficou do seu lado.',
  ],
  levelUp: [
    'Novo nível! Você desbloqueou mais um pedaço do mapa.',
    'Subiu de nível! Seu progresso está crescendo.',
    'Nível novo, ideia nova. Continue a explorar a trilha.',
    'Você evoluiu! A trilha tem mais para mostrar.',
  ],
  streak: [
    'Mais um dia na sequência! Continue assim.',
    'Sua constância está dando resultado. Bora manter o ritmo?',
    'A sequência cresceu! Volte amanhã para continuar.',
    'Dias seguidos de prática! Você está no caminho.',
  ],
  empty: [
    'Por aqui está tudo em dia. Que tal um quiz?',
    'Nada pendente por agora. Aproveite para revisar um conceito.',
    'Tudo limpo! Que tal explorar um nó novo?',
    'Sem tarefas aqui. Uma revisão rápida cai bem.',
  ],
};

export function pickLine(context: BitContext, n: number): string {
  const lines = BIT_LINES[context];
  const index = Number.isFinite(n)
    ? Math.abs(Math.trunc(n)) % lines.length
    : 0;
  const line = lines[index];

  if (line === undefined) {
    throw new Error(`Sem falas para o contexto: ${context}`);
  }

  return line;
}
