import React, { useDeferredValue, useState, useMemo, useEffect, useRef } from 'react';
import { PublicData, LinkCard } from '../types';
import { ArrowUpRight } from 'lucide-react';
import { Modal, Button } from './UI';
import { useNavigate } from 'react-router-dom';
import { PublicHeader } from './public/PublicHeader';
import { CategoryTabs } from './public/CategoryTabs';
import { CardGrid } from './public/CardGrid';
import { SearchOverlay } from './public/SearchOverlay';
import { CachedIcon } from './public/CachedIcon';

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

  // 三连击后台入口
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

  // 文档标题同步
  useEffect(() => {
    if (data.settings.title) {
      document.title = data.settings.title;
    }
  }, [data.settings.title]);

  // 搜索面板打开时聚焦
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // 全局快捷键
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
    <div className="min-h-screen flex flex-col bg-canvas text-1 transition-colors duration-300 font-sans">
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

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 border-t border-subtle/50">
        <div className="max-w-7xl mx-auto text-center text-3 text-[12.5px]">
          {data.settings.footerText || `© 2025 ${data.settings.title}`}
        </div>
      </footer>

      {/* 跳转确认弹窗 */}
      <Modal isOpen={!!confirmCard} onClose={() => setConfirmCard(null)} title="即将离开本站">
        <div className="flex flex-col items-center text-center space-y-5 pt-1">
          <div className="w-16 h-16 rounded-card bg-subtle border border-subtle flex items-center justify-center shrink-0 shadow-soft">
            <CachedIcon
              icon={confirmCard?.icon}
              siteUrl={confirmCard?.url}
              alt={confirmCard?.title}
              className="w-10 h-10 object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-[16px] text-1 tracking-tight-display">{confirmCard?.title}</h4>
            <p className="text-[13px] text-2 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {confirmCard?.description || '即将打开外部链接'}
            </p>
            {confirmCard?.url && (
              <p className="text-[11.5px] text-3 mt-2 truncate font-medium">{confirmCard.url}</p>
            )}
          </div>

          <div className="w-full flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmCard(null)}>取消</Button>
            <Button className="flex-1" onClick={() => { if (confirmCard) { window.open(confirmCard.url, '_blank', 'noopener,noreferrer'); setConfirmCard(null); } }}>
              <span>前往</span>
              <ArrowUpRight className="ml-1.5" size={15} strokeWidth={2.4} />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
