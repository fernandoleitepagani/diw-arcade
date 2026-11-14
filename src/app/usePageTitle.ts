import { useEffect } from 'react';

const PREFIX = 'DIW Arcade';

export const DEFAULT_DESCRIPTION =
  'Pratique Desenvolvimento de Interfaces Web como num fliperama: trilha, quiz, cartas e desafios de código no navegador.';

export const PAGE_DESCRIPTIONS = {
  Hoje: 'Seu próximo passo na trilha de Desenvolvimento de Interfaces Web, escolhido a partir do seu progresso.',
  Trilha:
    'Sua trilha de Desenvolvimento de Interfaces Web: veja os nós, as estrelas de domínio e o próximo passo recomendado.',
  Revisão:
    'Revise as cartas do dia com repetição espaçada. Cada revisão rende XP e mantém o conteúdo em dia.',
  Cartas:
    'Revise as cartas deste nó com repetição espaçada. Cada revisão rende XP e mantém o conteúdo em dia.',
  Quiz: 'Responda até 10 perguntas por rodada, veja a resposta certa e ganhe XP ao acertar de primeira.',
  Nó: 'Escolha entre quiz, cartas e desafios de código para dominar este nó da trilha.',
  Desafio:
    'Pratique HTML, CSS e JavaScript no navegador e veja cada requisito passar no checklist.',
  Laboratórios:
    'Guias de mini-projetos com rubrica, dicas e passos para praticar o que você aprendeu.',
  Laboratório:
    'Siga o guia deste mini-projeto com rubrica, dicas e passos para praticar o que você aprendeu.',
  Estatísticas:
    'Acompanhe seu XP, nível, sequência e o desempenho em cada nó da trilha.',
  Ajustes:
    'Configure sua meta diária, os limites de cartas e o backup do seu progresso.',
  'Boas-vindas':
    'Escolha sua meta diária e comece a praticar Desenvolvimento de Interfaces Web.',
  'Página não encontrada':
    'O endereço não existe. Volte para a árvore e continue praticando.',
} as const satisfies Record<string, string>;

type PageName = keyof typeof PAGE_DESCRIPTIONS;

function setDescription(description: string) {
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (meta === null) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.append(meta);
  }

  meta.content = description;
}

export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${PREFIX}: ${page}` : PREFIX;

    setDescription(
      page !== undefined && Object.hasOwn(PAGE_DESCRIPTIONS, page)
        ? PAGE_DESCRIPTIONS[page as PageName]
        : DEFAULT_DESCRIPTION,
    );
  }, [page]);
}
