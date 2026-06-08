import React, { useMemo } from 'react';
import { Home, Maximize2, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Category } from '../../types';
import { categoryPath, getCategoryIcon, sortCategories } from './categoryIcons';

type Theme = 'light' | 'dark' | 'system';

interface SidebarProps {
  categories: Category[];
  theme: Theme;
  onToggleTheme?: () => void;
  onLogoClick: () => void;
}

const useThemeIcon = (theme: Theme) =>
  useMemo(() => {
    if (theme === 'dark') return Moon;
    if (theme === 'light') return Sun;
    return Monitor;
  }, [theme]);

const themeLabel = (theme: Theme) => (theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '跟随系统');

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.();
  }
};

const useActiveCategoryId = (): string | null => {
  const match = useMatch('/c/:categoryId');
  return match?.params.categoryId ?? null;
};

const BrandMark: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`select-none font-bold tracking-tightest leading-none text-1 transition-transform duration-300 ease-spring active:scale-95 ${className}`}
    aria-label="Logo"
  >
    N<span className="text-accent">.</span>
  </button>
);

const navItemClass = (active: boolean) =>
  `flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[14.5px] font-medium transition-colors duration-200 ${
    active ? 'bg-accent-soft text-accent' : 'text-2 hover:bg-subtle hover:text-1'
  }`;

const utilityButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-surface text-2 transition-all duration-200 hover:border-accent/40 hover:bg-accent-soft hover:text-accent';

export const Sidebar: React.FC<SidebarProps> = ({ categories, theme, onToggleTheme, onLogoClick }) => {
  const navigate = useNavigate();
  const ThemeIcon = useThemeIcon(theme);
  const activeCategoryId = useActiveCategoryId();
  const sorted = useMemo(() => sortCategories(categories), [categories]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 p-3.5 md:block">
      <div className="flex h-full w-full flex-col rounded-3xl border border-subtle bg-surface p-4 shadow-card">
        <div className="px-2 pb-7 pt-2">
          <BrandMark onClick={onLogoClick} className="text-[30px]" />
        </div>

        <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          <button type="button" onClick={() => navigate('/')} className={navItemClass(activeCategoryId === null)}>
            <Home size={19} strokeWidth={2.1} />
            <span>首页</span>
          </button>
          {sorted.map((category, index) => {
            const ItemIcon = getCategoryIcon(index);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => navigate(categoryPath(category.id))}
                className={navItemClass(activeCategoryId === category.id)}
              >
                <ItemIcon size={19} strokeWidth={2.1} />
                <span className="truncate">{category.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 px-1 pt-5">
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} className={utilityButtonClass} title={`主题:${themeLabel(theme)}`} aria-label="切换主题">
              <ThemeIcon size={17} strokeWidth={2.1} />
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} className={utilityButtonClass} title="全屏" aria-label="全屏">
            <Maximize2 size={17} strokeWidth={2.1} />
          </button>
        </div>
      </div>
    </aside>
  );
};

interface MobileBarProps {
  theme: Theme;
  onToggleTheme?: () => void;
  onLogoClick: () => void;
  onSearchOpen: () => void;
}

export const MobileBar: React.FC<MobileBarProps> = ({ theme, onToggleTheme, onLogoClick, onSearchOpen }) => {
  const ThemeIcon = useThemeIcon(theme);
  const iconButtonClass = 'flex h-9 w-9 items-center justify-center rounded-pill text-2 transition-colors hover:bg-subtle hover:text-1';

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-subtle bg-canvas/80 px-4 backdrop-blur-xl md:hidden">
      <BrandMark onClick={onLogoClick} className="text-[22px]" />
      <div className="flex items-center gap-1">
        <button type="button" onClick={onSearchOpen} className={iconButtonClass} aria-label="搜索">
          <Search size={18} strokeWidth={2.1} />
        </button>
        {onToggleTheme && (
          <button type="button" onClick={onToggleTheme} className={iconButtonClass} aria-label="切换主题">
            <ThemeIcon size={17} strokeWidth={2.1} />
          </button>
        )}
      </div>
    </div>
  );
};
