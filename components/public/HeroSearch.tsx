import React from 'react';
import { Search } from 'lucide-react';

interface HeroSearchProps {
  onOpen: () => void;
  placeholder?: string;
}

const kbdClass = 'flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-subtle bg-subtle px-1.5 text-[12px] font-medium text-3';

export const HeroSearch: React.FC<HeroSearchProps> = ({ onOpen, placeholder = '搜索网站或工具...' }) => (
  <div className="mt-10 flex justify-center px-1 md:mt-12">
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full max-w-3xl items-center gap-3.5 rounded-2xl border border-subtle bg-surface p-2.5 pr-4 shadow-card transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-default hover:shadow-card-hover"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 ease-spring group-hover:scale-105">
        <Search size={22} strokeWidth={2.2} />
      </span>
      <span className="flex-1 truncate text-left text-[15.5px] text-3">{placeholder}</span>
      <span className="hidden items-center gap-1 sm:flex">
        <kbd className={kbdClass}>⌘</kbd>
        <kbd className={kbdClass}>K</kbd>
      </span>
    </button>
  </div>
);
