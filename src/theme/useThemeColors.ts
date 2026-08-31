import { useThemeStore } from '../store/themeStore';
import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from './colors';

export function useThemeColors(): ThemeColors {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
}
