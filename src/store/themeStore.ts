import { create } from 'zustand';

interface ThemeStore {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDarkMode: false,

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
