import { RouterProvider } from 'react-router';
import { ToastProvider } from '../components/ui/Toast/Toast';
import { ProgressProvider } from './ProgressProvider';
import { router } from './router';

export function App() {
  return (
    <ToastProvider>
      <ProgressProvider>
        <RouterProvider router={router} />
      </ProgressProvider>
    </ToastProvider>
  );
}
