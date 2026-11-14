import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '../../components/pixel/Button/Button';
import { PixelIcon } from '../../components/pixel/PixelIcon/PixelIcon';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import { SegBar } from '../../components/pixel/SegBar/SegBar';
import { ThemeToggle } from '../../components/pixel/ThemeToggle/ThemeToggle';
import { SPRITES } from '../../components/pixel/sprites';
import { NODES, UNITS } from '../../content/tree';
import { UNIT_COLOR } from '../../styles/unitColors';
import './LandingPage.css';

export interface LandingDay {
  xp: number;
  goal: number;
  streak: number;
}

export interface LandingPageProps {
  ctaTo: string;
  day?: LandingDay;
}

const SAMPLE_DAY: LandingDay = { xp: 32, goal: 50, streak: 4 };
const DAY_SEGMENTS = 26;
const DAY_WORDS = ['Zero', 'Um', 'Dois', 'Três', 'Quatro'];

const DISC_PALETTE = { X: 'currentColor', B: 'var(--bg)', O: 'var(--on-u)' };
const DISC_DONE = [
  '.....XXX.....',
  '...XXXXXXX...',
  '..XXXXXXXXX..',
  '.XXXXXXXXXXX.',
  '.XXXXXXXXOXX.',
  'XXXXXXXXOOXXX',
  'XXXOXXXOOXXXX',
  'XXXOOXOOXXXXX',
  '.XXXOOOXXXXX.',
  '.XXXXOXXXXXX.',
  '..XXXXXXXXX..',
  '...XXXXXXX...',
  '.....XXX.....',
];
const DISC_NOW = [
  '.....XXX.....',
  '...XXXXXXX...',
  '..XXXBBBXXX..',
  '.XXXBBBBBXXX.',
  '.XXBBXXXBBXX.',
  'XXBBXXXXXBBXX',
  'XXBBXXXXXBBXX',
  'XXBBXXXXXBBXX',
  '.XXBBXXXBBXX.',
  '.XXXBBBBBXXX.',
  '..XXXBBBXXX..',
  '...XXXXXXX...',
  '.....XXX.....',
];
const DISC_TODO = [
  '.....XXX.....',
  '...XXXXXXX...',
  '..XXBBBBBXX..',
  '.XXBBBBBBBXX.',
  '.XBBBBBBBBBX.',
  'XXBBBBBBBBBXX',
  'XXBBBBBBBBBXX',
  'XXBBBBBBBBBXX',
  '.XBBBBBBBBBX.',
  '.XXBBBBBBBXX.',
  '..XXBBBBBXX..',
  '...XXXXXXX...',
  '.....XXX.....',
];

type DiscRows = readonly string[];

interface Step {
  title: string;
  icon: 'book' | 'bolt' | 'cards' | 'braces';
  text: string;
  color: string;
  f: number;
  disc: DiscRows;
  path: string;
}

const STEPS = {
  ler: {
    title: 'Ler',
    icon: 'book',
    text: 'Seis a dez pontos tirados dos slides, cada um com o slide de origem. É o que faltava antes do quiz.',
    color: 'var(--u-fund)',
    f: 0.3,
    disc: DISC_DONE,
    path: 'M30 0 C30 55 72 45 72 100',
  },
  praticar: {
    title: 'Praticar',
    icon: 'bolt',
    text: 'Um quiz curto. A resposta vem com o motivo e o slide de onde saiu.',
    color: 'var(--u-css)',
    f: 0.72,
    disc: DISC_DONE,
    path: 'M72 0 C72 55 34 45 34 100',
  },
  fixar: {
    title: 'Fixar',
    icon: 'cards',
    text: 'O que você errou volta como carta, na hora certa de rever.',
    color: 'var(--u-js)',
    f: 0.34,
    disc: DISC_NOW,
    path: 'M34 0 C34 55 70 45 70 100',
  },
  construir: {
    title: 'Construir',
    icon: 'braces',
    text: 'Desafios de código com editor, pré-visualização e testes que dizem o que falta.',
    color: 'var(--u-dados)',
    f: 0.7,
    disc: DISC_TODO,
    path: 'M70 0 C70 55 40 45 40 100',
  },
} satisfies Record<string, Step>;

function Disc({ rows }: { rows: DiscRows }) {
  return (
    <span className="landing__disc">
      <PixelSprite rows={rows} palette={DISC_PALETTE} scale={3} />
    </span>
  );
}

function Trail({ step, children }: { step: Step; children: ReactNode }) {
  return (
    <div
      className="landing__row"
      style={{ '--f': step.f, '--c': step.color } as CSSProperties}
    >
      <div className="landing__col">
        <svg
          className="landing__path"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={step.path} />
        </svg>
        <Disc rows={step.disc} />
      </div>
      <div>
        <h2 className="landing__h2">
          <PixelIcon name={step.icon} scale={3} />
          {step.title}
        </h2>
        <p className="landing__d">{step.text}</p>
        {children}
      </div>
    </div>
  );
}

function Lines({ children }: { children: ReactNode[] }) {
  return (
    <div className="landing__code">
      {children.map((line, index) => (
        <div key={index}>
          <i>{index + 1}</i>
          {line}
        </div>
      ))}
    </div>
  );
}

function streakText(streak: number) {
  const count = DAY_WORDS[streak] ?? String(streak);
  return `${count} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}`;
}

export function LandingPage({ ctaTo, day }: LandingPageProps) {
  const shown = day ?? SAMPLE_DAY;
  const on = Math.min(
    DAY_SEGMENTS,
    Math.floor((shown.xp / shown.goal) * DAY_SEGMENTS),
  );
  const start = (
    <>
      Começar a trilha
      <PixelSprite {...SPRITES.play} scale={2} />
    </>
  );

  return (
    <div className="landing">
      <header className="landing__top">
        <div className="landing__top-in">
          <Link className="landing__brand" to="/">
            <PixelSprite {...SPRITES.logo} scale={3} />
            DIW Arcade
          </Link>
          <ThemeToggle />
          <ButtonLink to={ctaTo} variant="quiet" className="landing__enter">
            Entrar
          </ButtonLink>
        </div>
      </header>

      <main id="conteudo" className="landing__main">
        <section className="landing__hero">
          <div>
            <h1 className="landing__title">
              Aprenda interfaces web zerando a trilha.
            </h1>
            <p className="landing__lede">
              Aulas curtas, quizzes, cartas e desafios de código para
              Desenvolvimento de Interfaces Web. Roda no navegador e guarda seu
              progresso só no seu computador.
            </p>
            <div className="landing__cta">
              <ButtonLink to={ctaTo}>{start}</ButtonLink>
              <a className="btn quiet" href="#como">
                Ver como funciona
              </a>
            </div>
          </div>
          <PixelPanel
            className="landing__day"
            aria-label={
              day ? 'Seu dia de estudo' : 'Exemplo de um dia de estudo'
            }
            role="group"
          >
            <p>Um dia de estudo</p>
            <span className="landing__score">
              <PixelSprite {...SPRITES.coin} scale={3} />
              {shown.xp} XP
            </span>
            <SegBar on={on} total={DAY_SEGMENTS} color="var(--u-js)" />
            <p>
              {`Meta de ${shown.goal} XP. ${streakText(shown.streak)}`}
              <PixelSprite {...SPRITES.flame} scale={2} />
            </p>
          </PixelPanel>
        </section>

        <div className="landing__hw" id="como">
          <div className="landing__trail">
            <Trail step={STEPS.ler}>
              <PixelPanel className="landing__box">
                <div className="landing__cap">menu.css</div>
                <Lines>
                  {[
                    <>
                      <span className="k-t">.menu</span> {'{'}
                    </>,
                    <>
                      {'  '}
                      <span className="k-p">display</span>:{' '}
                      <span className="k-s">flex</span>;
                    </>,
                    '}',
                  ]}
                </Lines>
              </PixelPanel>
              <span className="landing__src">
                <PixelIcon name="book" />
                Fonte: aula 174, slide 3
              </span>
            </Trail>

            <Trail step={STEPS.praticar}>
              <PixelPanel className="landing__miniq">
                <b>Qual propriedade alinha no eixo principal?</b>
                <span className="landing__opt">A align-items</span>
                <span className="landing__opt landing__opt--ok">
                  B justify-content correto
                </span>
              </PixelPanel>
            </Trail>

            <Trail step={STEPS.fixar}>
              <PixelPanel className="landing__card">
                <span className="landing__front">
                  O que faz <code>justify-content</code>?
                </span>
                <span className="landing__back">
                  6 cartas para revisar hoje.
                </span>
              </PixelPanel>
            </Trail>

            <Trail step={STEPS.construir}>
              <PixelPanel className="landing__box">
                <Lines>
                  {[
                    <>
                      <span className="k-t">.menu</span> {'{'}
                    </>,
                    <>
                      {'  '}
                      <span className="k-p">gap</span>:{' '}
                      <span className="k-n">16px</span>;
                    </>,
                    '}',
                  ]}
                </Lines>
                <div className="landing__status">
                  <span className="landing__ok">3 testes passaram</span>
                  <span>+30 XP</span>
                </div>
              </PixelPanel>
            </Trail>

            <div
              className="landing__row"
              style={
                {
                  '--f': 0.4,
                  '--c': 'var(--u-prova)',
                } as CSSProperties
              }
            >
              <div className="landing__col">
                <Disc rows={DISC_TODO} />
              </div>
              <div>
                <h2 className="landing__h2">
                  <PixelSprite {...SPRITES.trophy} scale={3} />
                  Chegue na Prova 2
                </h2>
                <p className="landing__d">
                  {`Seis unidades e ${NODES.length} nós, com uma cor para cada linguagem. Sem conta e sem cadastro.`}
                </p>
                <ul className="landing__units" aria-label="Unidades da trilha">
                  {UNITS.map((unit) => (
                    <li key={unit.id}>
                      <i
                        className="landing__dot"
                        style={{ '--c': UNIT_COLOR[unit.id] } as CSSProperties}
                      />
                      {unit.title}
                      <small>{unit.nodes.length}</small>
                    </li>
                  ))}
                </ul>
                <div className="landing__cta landing__cta--end">
                  <ButtonLink to={ctaTo}>{start}</ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="landing__foot">
        <div>
          Projeto de estudo para a disciplina de Desenvolvimento de Interfaces
          Web da PUC Minas. Cada conteúdo cita o slide de origem.
        </div>
      </footer>
    </div>
  );
}
