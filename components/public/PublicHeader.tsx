import React, { useMemo } from 'react';
import { Compass, Monitor, Moon, Search, Sun } from 'lucide-react';

interface PublicHeaderProps {
  title: string;
  icon?: string;
  theme: 'light' | 'dark' | 'system';
  onSearchOpen: () => void;
  onToggleTheme?: () => void;
  onTitleClick: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ title, icon, theme, onSearchOpen, onToggleTheme, onTitleClick }) => {
  const ThemeIcon = useMemo(() => {
    if (theme === 'dark') return Moon;
    if (theme === 'light') return Sun;
    return Monitor;
  }, [theme]);

  return (
    <header className="sticky top-0 z-40 bg-[#fafaf9]/80 dark:bg-[#1c1917]/80 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-800/50 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none cursor-default" onClick={onTitleClick}>
          <div className="w-10 h-10 bg-stone-900 dark:bg-stone-100 rounded-xl flex items-center justify-center text-white dark:text-stone-900 shadow-xl shadow-stone-900/10">
            {icon && !icon.startsWith('http') ? <span className="text-lg">{icon}</span> : <Compass size={20} />}
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSearchOpen}
            className="w-10 h-10 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 flex items-center justify-center transition-colors text-stone-600 dark:text-stone-400"
            aria-label="Search"
            title="Search (Cmd+K)"
          >
            <Search size={22} />
          </button>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-10 h-10 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 flex items-center justify-center transition-colors text-stone-600 dark:text-stone-400"
              aria-label="Switch Theme"
              title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
            >
              <ThemeIcon size={22} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
