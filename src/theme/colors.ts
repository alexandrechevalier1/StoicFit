export interface ThemeColors {
  /** Fond des écrans. */
  background: string;
  /** Surface des cartes posées sur le fond. */
  card: string;
  /** Surface en creux (champs, pistes de jauge) à l'intérieur d'une carte. */
  cardMuted: string;
  text: string;
  subtleText: string;
  border: string;
  primary: string;
  /** Texte / icône posé sur `primary`. */
  onPrimary: string;
  /** Fond teinté de l'accent (vignettes, puces actives discrètes). */
  primarySoft: string;
  danger: string;
  success: string;
  warning: string;
  overlay: string;
  /** Couleurs de données nutrition : une teinte fixe par macro, partout dans l'app. */
  protein: string;
  carbs: string;
  fat: string;
  water: string;
}

// Palette « pierre & laurier » : fond minéral chaud, accent vert laurier, aucune couleur
// décorative en plus. Les couleurs vives (succès / alerte) sont réservées aux données.
export const LIGHT_COLORS: ThemeColors = {
  background: '#F4F3EF',
  card: '#FFFFFF',
  cardMuted: '#EEEDE8',
  text: '#16181A',
  subtleText: '#6A6D70',
  border: '#E3E1DA',
  primary: '#2F7A62',
  onPrimary: '#FFFFFF',
  primarySoft: '#E1EEE8',
  danger: '#C2453D',
  success: '#3C9A5F',
  warning: '#D08A2E',
  overlay: 'rgba(0,0,0,0.4)',
  protein: '#B8643A',
  carbs: '#B88A1F',
  fat: '#7468A8',
  water: '#3A86B8',
};

export const DARK_COLORS: ThemeColors = {
  background: '#0F1110',
  card: '#1A1D1C',
  cardMuted: '#242827',
  text: '#F1F2EF',
  subtleText: '#9BA19E',
  border: '#2A2F2D',
  primary: '#5FB494',
  onPrimary: '#0F1110',
  primarySoft: '#1D3A30',
  danger: '#E5736B',
  success: '#5DBB7E',
  warning: '#E3A452',
  overlay: 'rgba(0,0,0,0.6)',
  protein: '#E08E62',
  carbs: '#D9B44E',
  fat: '#A79BDB',
  water: '#6CB4E0',
};
