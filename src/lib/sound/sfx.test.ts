import { describe, expect, it, vi } from 'vitest';
import {
  createSfx,
  type SfxAudioContext,
  type SfxAudioParam,
  type SfxGain,
  type SfxOscillator,
} from './sfx';

const SOUNDS = [
  'correct',
  'wrong',
  'click',
  'levelUp',
  'achievement',
  'labStep',
] as const;

class FakeParam implements SfxAudioParam {
  value = 1;
  readonly events: { value: number; time: number }[] = [];

  setValueAtTime(value: number, time: number): void {
    this.events.push({ value, time });
  }

  linearRampToValueAtTime(value: number, time: number): void {
    this.events.push({ value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number): void {
    this.events.push({ value, time });
  }
}

class FakeGain implements SfxGain {
  readonly gain = new FakeParam();

  connect(): unknown {
    return this;
  }
}

class FakeOscillator implements SfxOscillator {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam();

  connect(): unknown {
    return this;
  }

  start(): void {}

  stop(): void {}
}

class FakeAudioContext implements SfxAudioContext {
  currentTime = 0;
  destination = {};
  readonly gains: FakeGain[] = [];
  readonly oscillators: FakeOscillator[] = [];

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}

describe('createSfx', () => {
  it('starts disabled and creates no AudioContext while disabled', () => {
    const context = new FakeAudioContext();
    const factory = vi.fn(() => context);
    const sfx = createSfx(factory);

    expect(sfx.isEnabled()).toBe(false);
    for (const sound of SOUNDS) sfx.play(sound);

    expect(factory).not.toHaveBeenCalled();
    expect(context.oscillators).toHaveLength(0);
  });

  it('reuses one context across plays when enabled', () => {
    const context = new FakeAudioContext();
    const factory = vi.fn(() => context);
    const sfx = createSfx(factory);

    sfx.setEnabled(true);
    expect(sfx.isEnabled()).toBe(true);
    for (const sound of SOUNDS) sfx.play(sound);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(context.oscillators.length).toBeGreaterThanOrEqual(SOUNDS.length);
  });

  it('keeps every gain at or below 0.05', () => {
    const context = new FakeAudioContext();
    const sfx = createSfx(() => context);

    sfx.setEnabled(true);
    for (const sound of SOUNDS) sfx.play(sound);

    const gains = context.gains.flatMap((gain) => [
      gain.gain.value,
      ...gain.gain.events.map((event) => event.value),
    ]);
    expect(gains.length).toBeGreaterThan(0);
    expect(Math.max(...gains)).toBeLessThanOrEqual(0.05);
    expect(Math.max(...gains)).toBeGreaterThan(0);
  });

  it('swallows a factory that throws', () => {
    const factory = vi.fn((): SfxAudioContext => {
      throw new Error('sem Web Audio');
    });
    const sfx = createSfx(factory);

    sfx.setEnabled(true);
    expect(() => sfx.play('correct')).not.toThrow();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
