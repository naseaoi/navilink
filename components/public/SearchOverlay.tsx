import React from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { LinkCard } from '../../types';
import { CachedIcon } from './CachedIcon';

interface SearchOverlayProps {
  isOpen: boolean;
  searchQuery: string;
  searchResults: LinkCard[];
  searchInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSearchQueryChange: (query: string) => void;
  onOpenResult: (card: LinkCard) => void;
}

const kbdClass =
  'flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-subtle bg-subtle px-1.5 text-[12px] font-medium text-3';

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  searchQuery,
  searchResults,
  searchInputRef,
  onClose,
  onSearchQueryChange,
  onOpenResult
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center px-4 pt-[12vh] bg-canvas/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-subtle bg-surface shadow-popover animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-subtle p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Search size={20} strokeWidth={2.2} />
          </span>
          <input
            ref={searchInputRef}
            className="flex-1 bg-transparent text-[15px] font-medium text-1 placeholder:text-3 focus:outline-none"
            placeholder="搜索网站或工具..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && searchResults[0]) {
                onOpenResult(searchResults[0]);
              }
            }}
          />
          <kbd className={`hidden sm:flex ${kbdClass}`}>ESC</kbd>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-3 transition-colors hover:bg-subtle hover:text-1 sm:hidden"
            aria-label="关闭"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="no-scrollbar max-h-[55vh] overflow-y-auto p-2">
          {!searchQuery.trim() && (
            <div className="px-5 py-12 text-center text-[13px] text-3">输入关键字开始搜索</div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <div className="px-5 py-12 text-center text-[13px] text-3">没有匹配的结果</div>
          )}

          {searchResults.length > 0 && (
            <ul className="flex flex-col gap-1">
              {searchResults.map((card, index) => (
                <li key={`search-${card.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpenResult(card)}
                    className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-subtle"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-subtle bg-subtle transition-colors group-hover:border-accent/30 group-hover:bg-accent-soft">
                      <CachedIcon icon={card.icon} siteUrl={card.url} alt={card.title} className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-1">{card.title}</div>
                      <div className="truncate text-[12.5px] text-3">{card.description || card.url}</div>
                    </div>
                    {index === 0 && <kbd className={`hidden sm:flex ${kbdClass}`}>↵</kbd>}
                    <ArrowUpRight size={16} strokeWidth={2.2} className="shrink-0 text-3 transition-colors group-hover:text-accent" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden items-center justify-between border-t border-subtle bg-subtle/40 px-4 py-2.5 text-[11.5px] text-3 sm:flex">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className={kbdClass}>↵</kbd>
              <span>打开</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className={kbdClass}>ESC</kbd>
              <span>关闭</span>
            </span>
          </div>
          <span>{searchResults.length} 条结果</span>
        </div>
      </div>
    </div>
  );
};
