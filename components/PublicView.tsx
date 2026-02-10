import React, { useDeferredValue, useState, useMemo, useEffect, useRef } from 'react';
import { PublicData, LinkCard } from '../types';
import { ArrowUpRight } from 'lucide-react';
import { Modal, Button } from './UI';
import { useNavigate } from 'react-router-dom';
import { PublicHeader } from './public/PublicHeader';
import { CategoryTabs } from './public/CategoryTabs';
import { CardGrid } from './public/CardGrid';
import { SearchOverlay } from './public/SearchOverlay';

const FALLBACK_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="#E7E5E4"/><rect x="16" y="18" width="32" height="28" rx="6" stroke="#78716C" stroke-width="3"/><circle cx="26" cy="28" r="3" fill="#78716C"/><path d="M20 42l9-9 6 6 5-5 8 8" stroke="#78716C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
)}`;

const resolveIconSrc = (icon?: string) => (icon && icon.trim() ? icon : FALLBACK_ICON);

const handleIconError = (event: React.SyntheticEvent<HTMLImageElement, Event>, url?: string) => {
  const target = event.currentTarget;
  if (target.dataset.fallback === 'favicon') {
    target.src = FALLBACK_ICON;
    return;
  }
  if (!url) {
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

interface PublicViewProps {
  data: PublicData;
  theme?: 'light' | 'dark' | 'system';
  onToggleTheme?: () => void;
}

export const PublicView: React.FC<PublicViewProps> = ({ data, theme = 'system', onToggleTheme }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmCard, setConfirmCard] = useState<LinkCard | null>(null);
  const [gridRenderKey, setGridRenderKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setGridRenderKey((prev) => prev + 1);
  };

  // Triple Click Logic
  const clickRef = useRef({ count: 0, lastTime: 0 });
  const handleTitleClick = () => {
    const now = Date.now();
    if (now - clickRef.current.lastTime < 500) {
      clickRef.current.count += 1;
    } else {
      clickRef.current.count = 1;
    }
    clickRef.current.lastTime = now;
    
    if (clickRef.current.count === 3) {
      clickRef.current.count = 0;
      navigate('/tat');
    }
  };

  // Sync Document Title
  useEffect(() => {
    if (data.settings.title) {
      document.title = data.settings.title;
    }
  }, [data.settings.title]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCards = useMemo(() => {
    let cards = [...data.cards];
    if (selectedCategory !== 'all') cards = cards.filter(c => c.categoryId === selectedCategory);
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      cards = cards.filter(c => (c.title || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    return cards.sort((a, b) => a.order - b.order);
  }, [data.cards, selectedCategory, deferredSearchQuery]);

  const searchResults = useMemo(() => filteredCards.slice(0, 8), [filteredCards]);

  const openSearchResult = (card: LinkCard) => {
    setConfirmCard(card);
    closeSearch();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-stone-800 dark:bg-[#1c1917] dark:text-stone-200 transition-colors duration-500 font-sans">
      <PublicHeader
        title={data.settings.title}
        icon={data.settings.icon}
        theme={theme}
        onSearchOpen={() => setIsSearchOpen(true)}
        onToggleTheme={onToggleTheme}
        onTitleClick={handleTitleClick}
      />
      <CategoryTabs categories={data.categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <CardGrid cards={filteredCards} selectedCategory={selectedCategory} gridRenderKey={gridRenderKey} onCardClick={setConfirmCard} />
      <SearchOverlay
        isOpen={isSearchOpen}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchInputRef={searchInputRef}
        onClose={closeSearch}
        onSearchQueryChange={setSearchQuery}
        onOpenResult={openSearchResult}
      />

      {/* --- Simple Footer --- */}
      <footer className="mt-auto py-8 text-center text-stone-400 text-sm font-medium">
        {data.settings.footerText || `© 2025 ${data.settings.title}. Minimalism.`}
      </footer>

      {/* --- Exit Modal (Redesigned) --- */}
      <Modal isOpen={!!confirmCard} onClose={() => setConfirmCard(null)} title="即将离开本站">
        <div className="flex flex-col items-center text-center space-y-6 pt-2">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 flex items-center justify-center shrink-0 shadow-lg shadow-stone-200/50">
            <img 
              src={resolveIconSrc(confirmCard?.icon)} 
              className="w-12 h-12 object-contain"
              loading="lazy"
              decoding="async"
              onError={(e) => handleIconError(e, confirmCard?.url)}
              alt={confirmCard?.title}
            />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xl text-stone-900 dark:text-stone-100">{confirmCard?.title}</h4>
            <p className="text-base text-stone-500 dark:text-stone-400 mt-2 max-w-xs mx-auto">
              {confirmCard?.description || '暂无详细描述。'}
            </p>
          </div>
          
          {/* Buttons */}
          <div className="w-full flex gap-4 pt-4">
            <Button variant="secondary" className="flex-1 h-12 text-base" onClick={() => setConfirmCard(null)}>取消</Button>
            <Button className="flex-1 h-12 text-base" onClick={() => { if(confirmCard) { window.open(confirmCard.url, '_blank', 'noopener,noreferrer'); setConfirmCard(null); } }}>
              确认前往 <ArrowUpRight className="ml-2" size={18} />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

