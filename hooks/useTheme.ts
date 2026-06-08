import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'navilink_theme';

const isThemeMode = (value: string | null): value is ThemeMode => (
  value === 'light' || value === 'dark' || value === 'system'
);

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (isThemeMode(stored)) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    };
    apply();
    localStorage.setItem(THEME_KEY, theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [theme]);

  const toggleTheme = () => {
    const cycle: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
    setTheme(cycle[theme]);
  };

  return { theme, toggleTheme };
};
