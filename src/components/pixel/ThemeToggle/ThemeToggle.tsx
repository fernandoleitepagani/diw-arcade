import { toggleTheme, useTheme } from '../../../lib/theme/theme';
import { PixelIcon } from '../PixelIcon/PixelIcon';
import './ThemeToggle.css';

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Alternar tema claro e escuro"
      onClick={toggleTheme}
    >
      <PixelIcon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
