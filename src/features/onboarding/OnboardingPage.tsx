import { useCallback, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useProgress } from '../../app/ProgressProvider';
import { usePageTitle } from '../../app/usePageTitle';
import { Bit } from '../../components/pixel/Bit/Bit';
import { PixelPanel } from '../../components/pixel/PixelPanel/PixelPanel';
import { Button } from '../../components/pixel/Button/Button';
import { pickLine } from '../../content/copy';
import type { DailyGoal } from '../../lib/progress/events';
import './OnboardingPage.css';

interface GoalOption {
  goal: DailyGoal;
  label: string;
}

const GOALS: readonly GoalOption[] = [
  { goal: 20, label: 'Leve, 20 XP' },
  { goal: 50, label: 'Regular, 50 XP' },
  { goal: 100, label: 'Intenso, 100 XP' },
];

/** Meta sugerida: o botão que recebe o foco ao abrir a página. */
const RECOMMENDED_GOAL: DailyGoal = 50;

export function OnboardingPage() {
  usePageTitle('Boas-vindas');

  const { save, dispatch } = useProgress();
  const navigate = useNavigate();
  const recommendedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    recommendedRef.current?.focus();
  }, []);

  const finish = useCallback(
    (dailyGoal?: DailyGoal) => {
      dispatch({ type: 'onboarding/complete', dailyGoal });
      navigate('/', { replace: true });
    },
    [dispatch, navigate],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      finish();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  if (save.onboarded) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="onboarding">
      <PixelPanel
        as="section"
        className="onboarding__card"
        aria-labelledby="onboarding-title"
      >
        <Bit line={pickLine('welcome', 0)} scale={16} />

        <div className="onboarding__intro">
          <h1 className="onboarding__brand" id="onboarding-title">
            DIW Arcade
          </h1>
          <p className="onboarding__welcome">Bem-vindo ao DIW Arcade</p>
          <h2 className="onboarding__question" id="onboarding-question">
            Quanto quer treinar por dia?
          </h2>
        </div>

        <div className="onboarding__goals">
          {GOALS.map(({ goal, label }) => (
            <Button
              key={goal}
              ref={goal === RECOMMENDED_GOAL ? recommendedRef : undefined}
              className="onboarding__goal"
              variant={goal === RECOMMENDED_GOAL ? 'primary' : 'quiet'}
              onClick={() => finish(goal)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Button
          className="onboarding__skip"
          variant="quiet"
          onClick={() => finish()}
        >
          Pular
        </Button>
      </PixelPanel>
    </main>
  );
}
