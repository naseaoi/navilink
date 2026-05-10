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

  const themeLabel = theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '跟随系统';
  const iconButtonClass = 'w-9 h-9 rounded-pill flex items-center justify-center text-2 hover:bg-subtle hover:text-1 transition-colors';

  return (
    <header className="sticky top-0 z-40 bg-canvas/75 backdrop-blur-xl border-b border-subtle/70 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo + 标题 */}
        <div className="flex items-center gap-3 select-none cursor-default group" onClick={onTitleClick}>
          <div className="w-9 h-9 rounded-control bg-1 flex items-center justify-center
            shadow-soft transition-transform duration-300 ease-spring group-active:scale-95
            bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300
            text-white dark:text-stone-900">
            {icon && !icon.startsWith('http') ? (
              <span className="text-base">{icon}</span>
            ) : (
              <Compass size={18} strokeWidth={2.2} />
            )}
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight-display text-1">{title}</h1>
        </div>

        {/* 操作区 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSearchOpen}
            className={iconButtonClass}
            aria-label="搜索"
            title="搜索 (Ctrl/Cmd+K)"
          >
            <Search size={18} strokeWidth={2.2} />
          </button>

          {/* 主题切换 */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={iconButtonClass}
              aria-label="切换主题"
              title={`主题:${themeLabel}`}
            >
              <ThemeIcon size={17} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
