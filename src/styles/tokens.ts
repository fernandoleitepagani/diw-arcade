export const tokens = {
  bg: '#0a1128',
  surface: '#111a36',
  surface2: '#1a2547',
  border: '#2c3a66',
  text: '#e8eefc',
  textMuted: '#a8b4d4',
  accent: '#2de2e6',
  reward: '#ff4fd8',
  xp: '#ffc23d',
  success: '#7cff6b',
  danger: '#ff6b8b',
  onAccent: '#0a1128',
  fontDisplay: '"Press Start 2P"',
  fontBody: '"Inter"',
  fontMono: '"JetBrains Mono"',
} as const;

export type TokenName = keyof typeof tokens;

export const cssVars: Record<TokenName, `--${string}`> = {
  bg: '--bg',
  surface: '--surface',
  surface2: '--surface-2',
  border: '--border',
  text: '--text',
  textMuted: '--text-muted',
  accent: '--accent',
  reward: '--reward',
  xp: '--xp',
  success: '--success',
  danger: '--danger',
  onAccent: '--on-accent',
  fontDisplay: '--font-display',
  fontBody: '--font-body',
  fontMono: '--font-mono',
};
