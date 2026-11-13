import { lazy, Suspense } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { PageSkeleton } from '../../components/ui';
import { useProgress } from '../../app/ProgressProvider';
import { resolveHome } from './resolveHome';

const LandingPage = lazy(() =>
  import('./LandingPage').then((module) => ({ default: module.LandingPage })),
);

export function HomeRoute() {
  const onboarded = useProgress().save.onboarded !== false;
  const [params] = useSearchParams();
  const view = resolveHome({ onboarded, forceLanding: params.has('inicio') });

  if (view === 'hoje') {
    return <Navigate to="/hoje" replace />;
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <LandingPage ctaTo={onboarded ? '/hoje' : '/boas-vindas'} />
    </Suspense>
  );
}
