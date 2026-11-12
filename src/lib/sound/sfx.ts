export type SfxName =
  | 'correct'
  | 'wrong'
  | 'click'
  | 'levelUp'
  | 'achievement'
  | 'labStep';

export interface SfxAudioParam {
  value: number;
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

export interface SfxGain {
  gain: SfxAudioParam;
  connect(destination: unknown): unknown;
}

export interface SfxOscillator {
  type: OscillatorType;
  frequency: SfxAudioParam;
  connect(destination: unknown): unknown;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface SfxAudioContext {
  currentTime: number;
  destination: unknown;
  createGain(): SfxGain;
  createOscillator(): SfxOscillator;
  resume?(): Promise<void>;
}

export type SfxFactory = () => SfxAudioContext;

export interface Sfx {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  play(name: SfxName): void;
}

const VOLUME = 0.04;
const SILENCE = 0.0001;
const ATTACK = 0.005;

interface Note {
  readonly frequency: number;
  readonly start: number;
  readonly duration: number;
}

const NOTES: Record<SfxName, readonly Note[]> = {
  correct: [
    { frequency: 659.25, start: 0, duration: 0.07 },
    { frequency: 987.77, start: 0.07, duration: 0.1 },
  ],
  wrong: [
    { frequency: 220, start: 0, duration: 0.1 },
    { frequency: 174.61, start: 0.1, duration: 0.14 },
  ],
  click: [{ frequency: 1046.5, start: 0, duration: 0.03 }],
  levelUp: [
    { frequency: 523.25, start: 0, duration: 0.07 },
    { frequency: 659.25, start: 0.07, duration: 0.07 },
    { frequency: 783.99, start: 0.14, duration: 0.07 },
    { frequency: 1046.5, start: 0.21, duration: 0.16 },
  ],
  achievement: [
    { frequency: 880, start: 0, duration: 0.07 },
    { frequency: 1108.73, start: 0.07, duration: 0.07 },
    { frequency: 1318.51, start: 0.14, duration: 0.18 },
  ],
  labStep: [
    { frequency: 587.33, start: 0, duration: 0.05 },
    { frequency: 880, start: 0.05, duration: 0.09 },
  ],
};

const defaultFactory: SfxFactory = () => new AudioContext();

export function createSfx(factory: SfxFactory = defaultFactory): Sfx {
  let enabled = false;
  let context: SfxAudioContext | null = null;
  let unavailable = false;

  function getContext(): SfxAudioContext | null {
    if (context) return context;
    if (unavailable) return null;
    try {
      context = factory();
      return context;
    } catch {
      unavailable = true;
      return null;
    }
  }

  function playNote(ctx: SfxAudioContext, note: Note, base: number): void {
    const start = base + note.start;
    const end = start + note.duration;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(note.frequency, start);
    gain.gain.value = 0;
    gain.gain.setValueAtTime(SILENCE, start);
    gain.gain.exponentialRampToValueAtTime(
      VOLUME,
      Math.min(start + ATTACK, end),
    );
    gain.gain.exponentialRampToValueAtTime(SILENCE, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  return {
    setEnabled(next: boolean): void {
      enabled = next;
    },

    isEnabled(): boolean {
      return enabled;
    },

    play(name: SfxName): void {
      if (!enabled) return;
      const ctx = getContext();
      if (!ctx) return;
      try {
        void ctx.resume?.()?.catch(() => {});
        const base = ctx.currentTime;
        for (const note of NOTES[name]) playNote(ctx, note, base);
      } catch {
        // Sound is decoration; an audio failure must never break an action.
      }
    },
  };
}
