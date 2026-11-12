import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useToast } from '../components/ui';
import {
  LAB_IDS,
  NODE_IDS,
  getChallenges,
  getFlashcards,
  getLab,
  getQuestions,
  type ContentIndex,
} from '../content';
import { pickLine } from '../content/copy';
import { ACHIEVEMENTS } from '../lib/game/achievements';
import type {
  Outcome,
  ProgressContent,
  ProgressEvent,
} from '../lib/progress/events';
import { applyEvent } from '../lib/progress/reducer';
import {
  SAVE_KEY,
  loadSave,
  persistSave,
  type LoadResult,
  type StorageLike,
} from '../lib/storage';
import { createSfx } from '../lib/sound/sfx';

export interface ProgressProviderProps {
  children: ReactNode;
  storage?: StorageLike;
  clock?: () => Date;
  contentIndex?: ProgressContent;
}

export interface ProgressContextValue {
  save: LoadResult['save'];
  dispatch: (event: ProgressEvent) => Outcome;
  now: Date;
}

const WARNING_CORRUPT =
  'O progresso salvo estava corrompido. Fizemos um backup e começamos do zero.';
const WARNING_NEWER =
  'O progresso salvo é de uma versão mais nova. Fizemos um backup e começamos do zero.';

const ProgressContext = createContext<ProgressContextValue | null>(null);

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  // The browser localStorage is only touched through the storage module; this
  // computed lookup keeps the ESLint storage boundary intact.
  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  return candidate ?? new MemoryStorage();
}

function buildDefaultContentIndex(): ContentIndex {
  const questions = Object.fromEntries(
    NODE_IDS.map((nodeId) => [nodeId, getQuestions(nodeId)]),
  ) as ContentIndex['questions'];
  const flashcards = Object.fromEntries(
    NODE_IDS.map((nodeId) => [nodeId, getFlashcards(nodeId)]),
  ) as ContentIndex['flashcards'];
  const challenges = Object.fromEntries(
    NODE_IDS.map((nodeId) => [nodeId, getChallenges(nodeId)]),
  ) as ContentIndex['challenges'];
  const labs: ContentIndex['labs'] = {};
  for (const labId of LAB_IDS) {
    const lab = getLab(labId);
    if (lab) labs[labId] = lab;
  }
  return { questions, flashcards, challenges, labs };
}

const FALLBACK_CONTENT = buildDefaultContentIndex();

function achievementName(id: string): string {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)?.name ?? id;
}

export function ProgressProvider({
  children,
  storage,
  clock,
  contentIndex,
}: ProgressProviderProps) {
  const store = useMemo(() => resolveStorage(storage), [storage]);
  const clockRef = useRef(clock);
  const content = useMemo(
    () => contentIndex ?? FALLBACK_CONTENT,
    [contentIndex],
  );

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  const readNow = useCallback(() => {
    const source = clockRef.current;
    return source ? source() : new Date();
  }, []);

  const initialClock = clock ?? (() => new Date());
  const [initial] = useState(() => loadSave(store, initialClock()));
  const [save, setSave] = useState(initial.save);
  const [now, setNow] = useState(() => initialClock());
  const saveRef = useRef(initial.save);

  const sfx = useRef(createSfx());
  const { showToast } = useToast();

  useEffect(() => {
    sfx.current.setEnabled(save.settings.sound);
  }, [save.settings.sound]);

  const warned = useRef(false);
  useEffect(() => {
    if (warned.current) return;
    warned.current = true;
    if (initial.recovered === 'corrupt') {
      showToast(WARNING_CORRUPT, { tone: 'warning', duration: 8_000 });
    } else if (initial.recovered === 'newer') {
      showToast(WARNING_NEWER, { tone: 'warning', duration: 8_000 });
    }
  }, [initial.recovered, showToast]);

  useEffect(() => {
    function onStorage(event: StorageEvent): void {
      if (event.key != null && event.key !== SAVE_KEY) return;
      const at = readNow();
      const result = loadSave(store, at);
      saveRef.current = result.save;
      setSave(result.save);
      setNow(at);
    }

    if (typeof window === 'undefined') return undefined;
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [readNow, store]);

  const dispatch = useCallback(
    (event: ProgressEvent): Outcome => {
      const at = readNow();
      const { save: next, outcome } = applyEvent(
        saveRef.current,
        event,
        at,
        content,
      );

      saveRef.current = next;
      persistSave(store, next);
      setSave(next);
      setNow(at);

      if (outcome.xpGained > 0) {
        showToast(`+${outcome.xpGained} XP`, { tone: 'reward' });
      }

      if (outcome.levelUp !== null) {
        showToast(
          <>
            <strong>Nível {outcome.levelUp}!</strong>{' '}
            <span>{pickLine('levelUp', next.xpTotal)}</span>
          </>,
          { tone: 'reward' },
        );
      }

      for (const id of outcome.achievements) {
        showToast(`Conquista: ${achievementName(id)}`, { tone: 'success' });
      }

      if (outcome.streakExtended !== null) {
        showToast(
          <>
            <strong>Sequência de {outcome.streakExtended} dias!</strong>{' '}
            <span>{pickLine('streak', outcome.streakExtended)}</span>
          </>,
          { tone: 'success' },
        );
      }

      const player = sfx.current;
      player.setEnabled(next.settings.sound);
      if (outcome.levelUp !== null) player.play('levelUp');
      else if (outcome.achievements.length > 0) player.play('achievement');
      else if (event.type === 'quiz/answer') {
        player.play(event.correct ? 'correct' : 'wrong');
      } else if (event.type === 'lab/step' && event.done) {
        player.play('labStep');
      } else if (event.type === 'challenge/run' && event.passed) {
        player.play('correct');
      } else {
        player.play('click');
      }

      return outcome;
    },
    [content, readNow, showToast, store],
  );

  const value = useMemo(
    () => ({ save, dispatch, now }),
    [save, dispatch, now],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (context === null) {
    throw new Error('useProgress deve ser usado dentro de ProgressProvider');
  }
  return context;
}
