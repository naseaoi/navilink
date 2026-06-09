import React, { useDeferredValue, useState, useMemo, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { PublicData, LinkCard } from '../types';
import { ArrowUpRight } from 'lucide-react';
import { Modal, Button } from './UI';
import { Sidebar, MobileBar } from './public/Sidebar';
import { SearchOverlay } from './public/SearchOverlay';
import { CachedIcon } from './public/CachedIcon';

interface PublicViewProps {
  data: PublicData;
  hasFetchedData: boolean;
  theme?: 'light' | 'dark' | 'system';
  onToggleTheme?: () => void;
}

export interface PublicOutletContext {
  data: PublicData;
  hasFetchedData: boolean;
  onCardClick: (card: LinkCard) => void;
  onSearchOpen: () => void;
}

export const usePublicOutlet = () => useOutletContext<PublicOutletContext>();

export const PublicView: React.FC<PublicViewProps> = ({ data, hasFetchedData, theme = 'system', onToggleTheme }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmCard, setConfirmCard] = useState<LinkCard | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const clickRef = useRef({ count: 0, lastTime: 0 });
  const handleLogoClick = () => {
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

  useEffect(() => {
    if (data.settings.title) document.title = data.settings.title;
  }, [data.settings.title]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

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

  const searchResults = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return [...data.cards]
      .filter((c) => (c.title || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order)
      .slice(0, 8);
  }, [data.cards, deferredSearchQuery]);

  const openSearchResult = (card: LinkCard) => {
    setConfirmCard(card);
    closeSearch();
  };

  const outletContext: PublicOutletContext = {
    data,
    hasFetchedData,
    onCardClick: setConfirmCard,
    onSearchOpen: () => setIsSearchOpen(true)
  };

  return (
    <div className="flex min-h-screen bg-canvas font-sans text-1 transition-colors duration-300">
      <Sidebar categories={data.categories} theme={theme} onToggleTheme={onToggleTheme} onLogoClick={handleLogoClick} />

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent/20 blur-[120px] dark:bg-accent/12" />
        <div className="pointer-events-none absolute right-20 top-8 h-[320px] w-[320px] rounded-full bg-fuchsia-400/15 blur-[110px] dark:bg-fuchsia-500/8" />

        <MobileBar theme={theme} onToggleTheme={onToggleTheme} onLogoClick={handleLogoClick} onSearchOpen={() => setIsSearchOpen(true)} />

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 md:px-12 md:py-20">
          <Outlet context={outletContext} />
        </main>
      </div>

      <SearchOverlay
        isOpen={isSearchOpen}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchInputRef={searchInputRef}
        onClose={closeSearch}
        onSearchQueryChange={setSearchQuery}
        onOpenResult={openSearchResult}
      />

      <Modal isOpen={!!confirmCard} onClose={() => setConfirmCard(null)} title="即将离开本站">
        <div className="flex flex-col items-center space-y-5 pt-1 text-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card border border-subtle bg-subtle shadow-soft">
            <CachedIcon icon={confirmCard?.icon} siteUrl={confirmCard?.url} alt={confirmCard?.title} className="h-10 w-10 object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-[16px] font-semibold tracking-tight-display text-1">{confirmCard?.title}</h4>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-2">
              {confirmCard?.description || '即将打开外部链接'}
            </p>
            {confirmCard?.url && <p className="mt-2 truncate text-[11.5px] font-medium text-3">{confirmCard.url}</p>}
          </div>

          <div className="flex w-full gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmCard(null)}>取消</Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (confirmCard) {
                  window.open(confirmCard.url, '_blank', 'noopener,noreferrer');
                  setConfirmCard(null);
                }
              }}
            >
              <span>前往</span>
              <ArrowUpRight className="ml-1.5" size={15} strokeWidth={2.4} />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
