import { createBrowserRouter, type RouteObject } from 'react-router';
import { ChallengePage } from '../features/challenge/ChallengePage';
import { FlashcardsPage } from '../features/flashcards/FlashcardsPage';
import { LabGuidePage } from '../features/labs/LabGuidePage';
import { LabsPage } from '../features/labs/LabsPage';
import { QuizPage } from '../features/quiz/QuizPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { StatsPage } from '../features/stats/StatsPage';
import { NodePage } from '../features/tree/NodePage';
import { TreePage } from '../features/tree/TreePage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <TreePage /> },
      { path: 'no/:nodeId', element: <NodePage /> },
      { path: 'no/:nodeId/quiz', element: <QuizPage /> },
      { path: 'no/:nodeId/cartas', element: <FlashcardsPage /> },
      { path: 'revisao', element: <FlashcardsPage /> },
      { path: 'desafio/:challengeId', element: <ChallengePage /> },
      { path: 'laboratorios', element: <LabsPage /> },
      { path: 'laboratorios/:labId', element: <LabGuidePage /> },
      { path: 'estatisticas', element: <StatsPage /> },
      { path: 'ajustes', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
