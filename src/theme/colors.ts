export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtleText: string;
  border: string;
  primary: string;
  danger: string;
  overlay: string;
}

export const LIGHT_COLORS: ThemeColors = {
  background: '#ffffff',
  card: '#F2F2F7',
  text: '#1C1C1E',
  subtleText: '#6E6E73',
  border: '#E1E1E6',
  primary: '#3E6FD9',
  danger: '#D9534F',
  overlay: 'rgba(0,0,0,0.4)',
};

export const DARK_COLORS: ThemeColors = {
  background: '#121214',
  card: '#1E1E22',
  text: '#F2F2F5',
  subtleText: '#A0A0A8',
  border: '#38383C',
  primary: '#6C93E0',
  danger: '#E08A87',
  overlay: 'rgba(0,0,0,0.6)',
};
