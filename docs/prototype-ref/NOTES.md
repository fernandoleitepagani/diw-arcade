# Trilha v4: protótipo descartável (v3 atualizado para o plano novo)

Abrir: `file:///home/fernandoleitepagani/Projects/DIW-Gameplay-ui/prototype/ui-redesign/index.html` (`mapa.html` lista as telas).
Branch `proto/ui-redesign` (scratch, nunca mesclar). HTML + CSS puros; fontes locais em `fonts/`; tema em `theme.js`.
Prints em `shots/`: `desk|phone-dark|light-<tela>.png` (1280x800 e 375x812), cada um também `-full`.
Fluxo: início, Hoje, Trilha, lição, Ler, quiz (certo e errado), resumo, Hoje. Desafio como tela extra. Progresso é só marcador.

## O que mudou na v4 (plano atualizado após o merge do conteúdo da Prova 2)
- Trilha com os **20 nós e 6 unidades reais** de `tree.ts`. Prova 2 é a unidade u6 com n15 a n20 (títulos reais). Os dois nós inventados saíram.
- **Unidades concluídas colapsam em uma linha** (Fundamentos e HTML: um disco com nome e "N de N nós, concluída"); a unidade atual fica aberta. Isso encurta a tela mais longa. A numeração 01 a 20 segue a sequência real dos nós.
- Discos "não iniciados" e "em andamento" agora têm fundo opaco: o caminho pontilhado não aparece mais por dentro.
- Página inicial e contadores falam em seis unidades e 20 nós.
- Rótulo de fonte nos primers e quizzes usa o formato novo ("Fonte: aula 174, slide 3"), sem ponto médio nem "aula-174". No app, `formatSource` deve gerar esse formato também para as fontes `tiaw`, `repo` e `orientacao`, que o protótipo não mostra.
- Colapsar/expandir é só visual aqui (link `#`); a interação fica para a onda 2.

## Por que refiz
A v2 parecia um site de desenvolvedor genérico: janelas com 3 círculos, botão de tecla, grade de pontos, grade de ícones, pílulas. Esse kit aparece em qualquer produto técnico. Voltei à Trilha da v1 (caminho contínuo, discos, contenção) e coloquei a identidade de computação e fliperama no próprio material das telas.

## Plano de design e revisão
Conceito: toda superfície é feita sobre uma grade de pixels visível, como o menu de um jogo. Elemento memorável: a trilha como mapa de mundo, com curva pontilhada, discos em pixel art e um cursor em "Você está aqui".
Revisão contra o genérico: neon sobre preto é o padrão de "fliperama", então não há glow nem neon; cor continua sendo só identidade de unidade; sem eyebrows, sem caixa alta, numeração só onde há sequência real (nós da trilha, pontos do primer, passos).

## O que define o visual
- **Cantos em degrau** (clip-path) no lugar de cantos arredondados: painéis, botões, opções do quiz.
- **Barras segmentadas** com vazio em dither xadrez (quiz, XP, domínio, passos). Substitui anel e barra lisa.
- **Pixel art**: discos de nó (feito com check, em andamento, não iniciado), cursor de menu, Bit, chama, moeda, troféu, ícones 8x8 de toda a interface.
- **Menu**: o item ativo ganha o cursor de seta, como um menu de jogo.
- **Tipografia**: Pixelify Sans só em exibição (títulos, marca, números grandes, nunca abaixo de 20 px), Hanken Grotesk no corpo, JetBrains Mono em código e números de sequência. Bricolage saiu.
- **Página inicial**: a própria trilha é o layout. Ler, Praticar, Fixar e Construir são nós ao longo da curva, cada um com uma prévia real; o último nó é a Prova 2 e a chamada final.
- Tema claro e escuro, com variantes de cor de unidade para o claro.

## Contraste medido (WCAG)
- Escuro: texto secundário 6,36:1 (fundo) e 5,91:1 (painel); traço do caminho e discos vazios 4,0:1; unidades 5,8 a 11,7:1; botão 17,1:1.
- Claro: texto secundário 6,08:1 e 7,0:1; traço 3,5:1; unidades sobre o fundo 3,7 a 5,1:1 (gráficos, mínimo 3:1); check sobre unidade 4,3 a 5,9:1; acerto 5,0:1 e erro 5,5:1.
- Alvos de toque no celular: varredura automática sem itens abaixo de 44 px; sem rolagem horizontal.

## Autocrítica desta rodada
- Avatar sem a inicial (o painel cobria o texto): corrigido.
- Pixelify torna o "f" minúsculo parecido com "A" ("flexbox" lia "Aexbox"). Perguntas do quiz e título do desafio voltaram para Hanken; Pixelify ficou em títulos curtos. Decidir se o "f" é aceitável em "interfaces" no título da página inicial.
- Cursor do menu e discos: contornos de foco em elementos com clip-path precisam de revisão no app real (o contorno é desenhado por dentro).
- Moldura da pré-visualização do desafio mostra um fio no topo por causa do corte em degrau.

## Pontos fracos e o que eu faria diferente
- Pixel art em 8x8 é rascunho; em produção, desenhar com cuidado e testar em telas de alta densidade.
- O recorte em degrau usa clip-path com 2 camadas; no React vira um componente `PixelPanel`, e o foco precisa de teste.
- Não testei teclado, leitor de tela nem o clique do botão de tema, só a preferência do sistema emulada.
- Fundamentos da Web segue neutro; Dados e JavaScript usam o amarelo e o teal de Dados está sem uso.
- Progresso e estados vazios ficam para o plano.

## Para o plano
Decididos: direção Trilha, primers Ler na v1, tema claro e escuro, página inicial. Abertos: aceitar fonte pixel em títulos (e quais), mapa de cores por unidade, escopo do Progresso.
