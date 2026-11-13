import { Link } from 'react-router';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { PixelSprite } from '../../components/pixel/PixelSprite/PixelSprite';
import { Button } from '../../components/pixel/Button/Button';
import { ButtonLink } from '../../components/pixel/Button/Button';
import { SPRITES } from '../../components/pixel/sprites';
import { toggleTheme } from '../../lib/theme/theme';
import './LandingPage.css';

const STEPS = [
  {
    name: 'Ler',
    lead: 'Um resumo curto de cada aula, com a fonte do slide.',
    preview: (
      <p className="landing__text">
        O navegador lê o HTML e monta o DOM, uma árvore de elementos que o CSS
        e o JavaScript podem alterar.
      </p>
    ),
    source: 'Fonte: aula 174, slide 3',
  },
  {
    name: 'Praticar',
    lead: 'Quiz com resposta comentada, no seu ritmo.',
    preview: (
      <>
        <p className="landing__text">Qual tag define o título principal?</p>
        <ul className="landing__options">
          <li>{'<title>'}</li>
          <li>{'<h1>'}</li>
          <li>{'<header>'}</li>
        </ul>
      </>
    ),
  },
  {
    name: 'Fixar',
    lead: 'Cartas com repetição espaçada para o que você esquece.',
    preview: (
      <p className="landing__text">
        O que faz <code>querySelector</code>? <span>Revele a resposta.</span>
      </p>
    ),
  },
  {
    name: 'Construir',
    lead: 'Desafios de código que rodam aqui mesmo, no navegador.',
    preview: (
      <pre className="landing__code">
        <code>{'<h1>Minha página</h1>\n<p>Olá, web.</p>'}</code>
      </pre>
    ),
  },
] as const;

export interface LandingPageProps {
  ctaTo: string;
}

export function LandingPage({ ctaTo }: LandingPageProps) {
  return (
    <div className="landing">
      <header className="landing__top">
        <Link className="landing__brand" to="/">
          <PixelSprite {...SPRITES.logo} scale={3} />
          DIW Arcade
        </Link>
        <Button
          variant="quiet"
          aria-label="Alternar tema claro e escuro"
          onClick={toggleTheme}
        >
          Tema
        </Button>
      </header>

      <main className="landing__main" id="conteudo">
        <section className="landing__hero">
          <h1 className="landing__title">
            Aprenda interfaces web zerando a trilha
          </h1>
          <p className="landing__sub">
            Desenvolvimento de Interfaces Web, em quatro passos por tema: ler,
            praticar, fixar e construir.
          </p>
          <ButtonLink to={ctaTo}>Começar a trilha</ButtonLink>
        </section>

        <ol className="landing__trail">
          {STEPS.map((step, index) => (
            <li
              key={step.name}
              className={`landing__node landing__node--${index % 2 === 0 ? 'a' : 'b'}`}
            >
              <span className="landing__disc" aria-hidden="true">
                {index + 1}
              </span>
              <PixelPanel as="article" className="landing__card">
                <h2 className="landing__step">{step.name}</h2>
                <p className="landing__lead">{step.lead}</p>
                {step.preview}
                {'source' in step ? (
                  <p className="landing__source">{step.source}</p>
                ) : null}
              </PixelPanel>
            </li>
          ))}
        </ol>

        <section className="landing__end">
          <h2 className="landing__endtitle">Chegue preparado à Prova 2</h2>
          <p className="landing__sub">
            A trilha termina com revisão de código, DOM, eventos, fetch e
            formulários.
          </p>
          <ButtonLink to={ctaTo}>Começar agora</ButtonLink>
        </section>
      </main>
    </div>
  );
}
