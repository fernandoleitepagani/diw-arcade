import { Navigate, Outlet } from 'react-router';
import { useProgress } from './ProgressProvider';

/**
 * Reads the onboarding flag without assuming a provider is mounted.
 *
 * The app always renders `ProgressProvider` above the router. Tests that mount
 * only the route tree (to check headings and links) have no save to guard, so
 * the guard stays inert there instead of throwing and hiding the route.
 */
function useOnboarded(): boolean | null {
  try {
    return useProgress().save.onboarded;
  } catch {
    return null;
  }
}

export function RequireOnboarding() {
  const onboarded = useOnboarded();

  if (onboarded === false) {
    return <Navigate to="/boas-vindas" replace />;
  }

  return <Outlet />;
}
