import React from 'react';
import { ArrowUpRight, Command, X } from 'lucide-react';
import { LinkCard } from '../../types';

const FALLBACK_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="#E7E5E4"/><rect x="16" y="18" width="32" height="28" rx="6" stroke="#78716C" stroke-width="3"/><circle cx="26" cy="28" r="3" fill="#78716C"/><path d="M20 42l9-9 6 6 5-5 8 8" stroke="#78716C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
)}`;

const resolveIconSrc = (icon?: string) => (icon && icon.trim() ? icon : FALLBACK_ICON);

const handleIconError = (event: React.SyntheticEvent<HTMLImageElement, Event>, url: string) => {
  const target = event.currentTarget;
  if (target.dataset.fallback === 'favicon') {
    target.src = FALLBACK_ICON;
    return;
  }
  try {
    target.src = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`;
    target.dataset.fallback = 'favicon';
  } catch {
    target.src = FALLBACK_ICON;
  }
};

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
    <div className="fixed inset-0 z-[100] bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col items-center pt-[15vh] px-6">
      <div className="w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute -right-2 -top-12 md:-right-12 md:top-0 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100">
          <X size={28} />
        </button>
        <input
          ref={searchInputRef}
          className="w-full bg-transparent border-b-2 border-stone-200 dark:border-stone-800 text-3xl md:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 px-2 py-4 focus:outline-none focus:border-stone-900 dark:focus:border-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 transition-colors"
          placeholder="Type to search..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && searchResults[0]) {
              onOpenResult(searchResults[0]);
            }
          }}
        />
        <div className="mt-8 text-center text-stone-400 text-sm font-medium flex items-center justify-center gap-2">
          <Command size={14} /> K to search anytime
        </div>
        <div className="mt-6 max-h-[45vh] overflow-y-auto pr-1">
          {!searchQuery.trim() && <div className="text-center text-stone-400 text-sm">输入关键字后可直接在这里选择结果</div>}
          {searchQuery.trim() && searchResults.length === 0 && <div className="text-center text-stone-400 text-sm">没有匹配结果</div>}
          {searchResults.map((card) => (
            <button
              key={`search-${card.id}`}
              type="button"
              onClick={() => onOpenResult(card)}
              className="w-full mt-2 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/70 px-4 py-3 text-left flex items-center gap-3 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
            >
              <img
                src={resolveIconSrc(card.icon)}
                loading="lazy"
                decoding="async"
                alt={card.title}
                className="w-7 h-7 rounded-md object-contain"
                onError={(e) => handleIconError(e, card.url)}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{card.title}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400 truncate">{card.description || card.url}</span>
              </span>
              <ArrowUpRight size={16} className="text-stone-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
