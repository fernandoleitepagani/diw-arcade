import { Navigate, Outlet } from 'react-router';
import { useProgress } from './ProgressProvider';

export function RequireOnboarding() {
  const onboarded = useProgress().save.onboarded;

  if (onboarded === false) {
    return <Navigate to="/boas-vindas" replace />;
  }

  return <Outlet />;
}
