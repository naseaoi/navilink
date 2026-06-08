import React from 'react';
import { Search } from 'lucide-react';

interface HeroSearchProps {
  onOpen: () => void;
  placeholder?: string;
}

const kbdClass = 'flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-subtle bg-subtle px-1.5 text-[12px] font-medium text-3';

export const HeroSearch: React.FC<HeroSearchProps> = ({ onOpen, placeholder = '搜索网站或工具...' }) => (
  <div className="mt-8 flex justify-center px-1 md:mt-10">
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full max-w-2xl items-center gap-3 rounded-card border border-subtle bg-surface p-2 pr-3 shadow-card transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-default hover:shadow-card-hover"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 ease-spring group-hover:scale-105">
        <Search size={20} strokeWidth={2.2} />
      </span>
      <span className="flex-1 truncate text-[15px] text-3">{placeholder}</span>
      <span className="hidden items-center gap-1 sm:flex">
        <kbd className={kbdClass}>⌘</kbd>
        <kbd className={kbdClass}>K</kbd>
      </span>
    </button>
  </div>
);
