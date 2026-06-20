import { create } from 'zustand';

const KEY = 'sanicom_theme';

const applyTheme = (dark) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const saved = localStorage.getItem(KEY);
const initialDark = saved !== null ? saved === 'dark' : false;
applyTheme(initialDark);

export const useThemeStore = create((set) => ({
  dark: initialDark,
  toggle: () => set((s) => {
    const next = !s.dark;
    localStorage.setItem(KEY, next ? 'dark' : 'light');
    applyTheme(next);
    return { dark: next };
  }),
}));
