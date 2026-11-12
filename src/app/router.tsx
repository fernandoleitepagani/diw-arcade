import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { PageSkeleton } from '../components/ui';
import { Layout } from './Layout';
import { RequireOnboarding } from './RequireOnboarding';
import { SessionLayout } from './SessionLayout';

const ChallengePage = lazy(() =>
  import('../features/challenge/ChallengePage').then((module) => ({
    default: module.ChallengePage,
  })),
);
const FlashcardsPage = lazy(() =>
  import('../features/flashcards/FlashcardsPage').then((module) => ({
    default: module.FlashcardsPage,
  })),
);
const LabGuidePage = lazy(() =>
  import('../features/labs/LabGuidePage').then((module) => ({
    default: module.LabGuidePage,
  })),
);
const LabsPage = lazy(() =>
  import('../features/labs/LabsPage').then((module) => ({
    default: module.LabsPage,
  })),
);
const OnboardingPage = lazy(() =>
  import('../features/onboarding/OnboardingPage').then((module) => ({
    default: module.OnboardingPage,
  })),
);
const QuizPage = lazy(() =>
  import('../features/quiz/QuizPage').then((module) => ({
    default: module.QuizPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const StatsPage = lazy(() =>
  import('../features/stats/StatsPage').then((module) => ({
    default: module.StatsPage,
  })),
);
const NodePage = lazy(() =>
  import('../features/tree/NodePage').then((module) => ({
    default: module.NodePage,
  })),
);
const TreePage = lazy(() =>
  import('../features/tree/TreePage').then((module) => ({
    default: module.TreePage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

export const routes: RouteObject[] = [
  {
    path: '/boas-vindas',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <OnboardingPage />
      </Suspense>
    ),
  },
  {
    element: <RequireOnboarding />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <TreePage /> },
          { path: 'no/:nodeId', element: <NodePage /> },
          { path: 'laboratorios', element: <LabsPage /> },
          { path: 'laboratorios/:labId', element: <LabGuidePage /> },
          { path: 'estatisticas', element: <StatsPage /> },
          { path: 'ajustes', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <SessionLayout />,
        children: [
          { path: 'no/:nodeId/quiz', element: <QuizPage /> },
          { path: 'no/:nodeId/cartas', element: <FlashcardsPage /> },
          { path: 'revisao', element: <FlashcardsPage /> },
          { path: 'desafio/:challengeId', element: <ChallengePage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
