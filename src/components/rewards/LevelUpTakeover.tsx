import { Dialog } from '../session/Dialog';
import { Button, Mascot } from '../ui';
import './rewards.css';

export interface LevelUpTakeoverProps {
  level: number;
  line: string;
  onClose: () => void;
}

/**
 * Full-screen takeover shown when the player reaches a new level. It replaces
 * the old level-up toast, so the moment reads as a reward instead of a notice.
 */
export function LevelUpTakeover({ level, line, onClose }: LevelUpTakeoverProps) {
  return (
    <Dialog open title={`Nível ${level}!`} onClose={onClose}>
      <div className="level-up">
        <Mascot mood="happy" line={line} size={128} />
        <Button className="level-up__continue" onClick={onClose}>
          Continuar
        </Button>
      </div>
    </Dialog>
  );
}
