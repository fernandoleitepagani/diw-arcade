import { ICON_ROWS, type IconName } from '../icons';
import { PixelSprite } from '../PixelSprite/PixelSprite';

export interface PixelIconProps {
  name: IconName;
  scale?: number;
}

const ICON_PALETTE = { X: 'currentColor' };

export function PixelIcon({ name, scale = 2 }: PixelIconProps) {
  return (
    <PixelSprite rows={ICON_ROWS[name]} palette={ICON_PALETTE} scale={scale} />
  );
}
