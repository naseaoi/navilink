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
      className="fixed inset-0 z-[100] bg-canvas/85 backdrop-blur-xl animate-in fade-in duration-200
        flex flex-col items-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-raised border border-subtle rounded-modal shadow-popover
          overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索输入区 */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-subtle">
          <Search size={18} strokeWidth={2.2} className="text-3 shrink-0" />
          <input
            ref={searchInputRef}
            className="flex-1 bg-transparent text-[15px] font-medium text-1 placeholder:text-3
              focus:outline-none"
            placeholder="搜索导航卡片..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && searchResults[0]) {
                onOpenResult(searchResults[0]);
              }
            }}
          />
          <kbd className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium
            bg-subtle border border-subtle text-3 hidden sm:inline-block">ESC</kbd>
          <button
            onClick={onClose}
            className="sm:hidden w-8 h-8 rounded-pill flex items-center justify-center text-3 hover:bg-subtle"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 结果列表 - 隐藏滚动条 */}
        <div className="max-h-[55vh] overflow-y-auto no-scrollbar">
          {!searchQuery.trim() && (
            <div className="px-5 py-10 text-center text-3 text-[13px]">
              输入关键字开始搜索
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <div className="px-5 py-10 text-center text-3 text-[13px]">
              没有匹配的结果
            </div>
          )}

          {searchResults.length > 0 && (
            <ul className="p-2">
              {searchResults.map((card, index) => (
                <li key={`search-${card.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpenResult(card)}
                    className="group w-full px-3 py-2.5 rounded-control flex items-center gap-3
                      hover:bg-subtle text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-control bg-subtle border border-subtle flex items-center justify-center shrink-0
                      group-hover:bg-accent-soft group-hover:border-accent/30 transition-colors">
                      <CachedIcon
                        icon={card.icon}
                        siteUrl={card.url}
                        alt={card.title}
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-1 truncate">{card.title}</div>
                      <div className="text-[12px] text-3 truncate">{card.description || card.url}</div>
                    </div>
                    {index === 0 && (
                      <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium
                        bg-canvas border border-subtle text-3">↵</kbd>
                    )}
                    <ArrowUpRight size={14} className="text-3 group-hover:text-accent transition-colors shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 底部提示 */}
        <div className="hidden sm:flex items-center justify-between px-5 h-10 border-t border-subtle bg-subtle/40 text-[11px] text-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md font-mono bg-surface border border-subtle">↵</kbd>
              <span>打开</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md font-mono bg-surface border border-subtle">ESC</kbd>
              <span>关闭</span>
            </span>
          </div>
          <span>{searchResults.length} 条结果</span>
        </div>
      </div>
    </div>
  );
};
