export type HomeView = 'landing' | 'hoje';

export interface HomeInput {
  onboarded: boolean;
  /** `/?inicio`: mostra a landing mesmo para quem já fez o onboarding. */
  forceLanding: boolean;
}

export function resolveHome({ onboarded, forceLanding }: HomeInput): HomeView {
  return onboarded && !forceLanding ? 'hoje' : 'landing';
}
