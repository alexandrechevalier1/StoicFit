import type { TextStyle } from 'react-native';

/** Échelle d'espacement : n'utiliser que ces valeurs pour les marges et paddings. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Marge horizontale de tous les écrans. */
export const SCREEN_PADDING = spacing.lg;

/** Taille minimale d'une zone tactile. */
export const TOUCH_TARGET = 44;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Échelle typographique : chaque texte de l'app doit utiliser un de ces rôles.
 * `number*` sert aux valeurs chiffrées (poids, reps, kcal) : chiffres à chasse fixe,
 * pour que les colonnes restent alignées sans police monospace.
 */
export const typography = {
  largeTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyStrong: { fontSize: 16, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  captionStrong: { fontSize: 13, fontWeight: '600' },
  numberLarge: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, ...tabular },
  number: { fontSize: 16, fontWeight: '600', ...tabular },
} satisfies Record<string, TextStyle>;
