import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PublicData, LinkCard } from '../types';
import { Search, Compass, ArrowUpRight, Command, X, Sun, Moon, Monitor } from 'lucide-react';
import { Modal, Button } from './UI';
import { useNavigate } from 'react-router-dom';

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
  // 更新状态以存储整个卡片对象，而不仅仅是 URL
  const [confirmCard, setConfirmCard] = useState<LinkCard | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCards = useMemo(() => {
    let cards = data.cards;
    if (selectedCategory !== 'all') cards = cards.filter(c => c.categoryId === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    return cards.sort((a, b) => a.order - b.order);
  }, [data.cards, selectedCategory, searchQuery]);

  const ThemeIcon = useMemo(() => {
    switch(theme) {
      case 'dark': return Moon;
      case 'light': return Sun;
      default: return Monitor;
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-800 dark:bg-[#1c1917] dark:text-stone-200 transition-colors duration-500 font-sans">
      
      {/* --- Minimal Header --- */}
      <header className="sticky top-0 z-40 bg-[#fafaf9]/80 dark:bg-[#1c1917]/80 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-800/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo / Title */}
          <div 
            className="flex items-center gap-3 select-none cursor-default active:scale-95 transition-transform"
            onClick={handleTitleClick}
          >
            <div className="w-10 h-10 bg-stone-900 dark:bg-stone-100 rounded-full flex items-center justify-center text-white dark:text-stone-900 shadow-xl shadow-stone-900/10">
              {data.settings.icon && !data.settings.icon.startsWith('http') ? (
                <span className="text-lg">{data.settings.icon}</span>
              ) : <Compass size={20} />}
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {data.settings.title}
            </h1>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 flex items-center justify-center transition-colors text-stone-600 dark:text-stone-400"
              aria-label="Search"
              title="Search (Cmd+K)"
            >
              <Search size={22} />
            </button>
            
            {onToggleTheme && (
              <button 
                onClick={onToggleTheme}
                className="w-10 h-10 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-800 flex items-center justify-center transition-colors text-stone-600 dark:text-stone-400"
                aria-label="Switch Theme"
                title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
              >
                <ThemeIcon size={22} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- Category Tabs (Clean Text) --- */}
      <nav className="pt-8 pb-4 px-6 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-8 border-b border-stone-200 dark:border-stone-800 w-max min-w-full px-2">
          <CategoryTab active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} label="全部" />
          {data.categories.sort((a,b) => a.order - b.order).map(cat => (
            <CategoryTab key={cat.id} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} label={cat.name} />
          ))}
        </div>
      </nav>

      {/* --- Main Grid --- */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-32 min-h-[60vh]">
        <div key={selectedCategory} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredCards.map((card, index) => (
            <CardItem 
              key={card.id} 
              card={card} 
              onClick={() => setConfirmCard(card)} 
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-card-enter"
            />
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-24 text-center animate-card-enter">
               <p className="text-stone-400 font-serif italic text-lg">No treasures found.</p>
            </div>
          )}
        </div>
      </main>

      {/* --- Search Overlay (Zen Mode) --- */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col items-center pt-[15vh] px-6">
          <div className="w-full max-w-2xl relative">
            <button onClick={() => setIsSearchOpen(false)} className="absolute -right-2 -top-12 md:-right-12 md:top-0 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100">
              <X size={28} />
            </button>
            <input
              ref={searchInputRef}
              className="w-full bg-transparent border-b-2 border-stone-200 dark:border-stone-800 text-3xl md:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 px-2 py-4 focus:outline-none focus:border-stone-900 dark:focus:border-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-700 transition-colors"
              placeholder="Type to search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="mt-8 text-center text-stone-400 text-sm font-medium flex items-center justify-center gap-2">
              <Command size={14} /> K to search anytime
            </div>
          </div>
        </div>
      )}

      {/* --- Simple Footer --- */}
      <footer className="py-12 text-center text-stone-400 text-sm font-medium">
        {data.settings.footerText || `© 2025 ${data.settings.title}. Minimalism.`}
      </footer>

      {/* --- Exit Modal (Enhanced Content) --- */}
      <Modal isOpen={!!confirmCard} onClose={() => setConfirmCard(null)} title="即将离开本站">
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-100 dark:border-stone-800">
            <div className="w-14 h-14 rounded-lg bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 flex items-center justify-center shrink-0">
              <img 
                src={confirmCard?.icon} 
                className="w-9 h-9 object-contain"
                onError={e => { try { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(confirmCard?.url || '').hostname}&sz=128` } catch {} }}
                alt=""
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-lg text-stone-900 dark:text-stone-100 truncate">{confirmCard?.title}</h4>
              <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">{confirmCard?.description || '暂无详细描述。'}</p>
            </div>
          </div>
          
          <div className="p-3 bg-stone-100 dark:bg-stone-900 rounded-lg text-[10px] font-mono text-stone-400 break-all border border-stone-200 dark:border-stone-800">
            {confirmCard?.url}
          </div>
          
          <div className="flex gap-4 pt-2">
            <Button variant="secondary" className="flex-1 h-12 text-base" onClick={() => setConfirmCard(null)}>取消</Button>
            <Button className="flex-1 h-12 text-base" onClick={() => { if(confirmCard) { window.open(confirmCard.url, '_blank'); setConfirmCard(null); } }}>
              确认前往 <ArrowUpRight className="ml-2" size={18} />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const CategoryTab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`pb-4 px-2 text-base font-medium transition-all relative whitespace-nowrap ${
      active 
        ? 'text-stone-900 dark:text-stone-100' 
        : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
    }`}
  >
    {label}
    {active && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 dark:bg-stone-100 rounded-full" />
    )}
  </button>
);

const CardItem: React.FC<{ card: LinkCard; onClick: () => void; style?: React.CSSProperties; className?: string }> = ({ card, onClick, style, className = '' }) => (
  <div 
    onClick={onClick}
    style={style}
    className={`group bg-white dark:bg-[#252220] p-5 rounded-xl border border-stone-100 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-none transition-all duration-300 cursor-pointer flex flex-col gap-4 h-full ${className}`}
  >
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
        <img 
          src={card.icon} 
          className="w-7 h-7 object-contain opacity-90 group-hover:opacity-100"
          onError={e => { try { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=128` } catch {} }}
        />
      </div>
      <ArrowUpRight size={18} className="text-stone-300 group-hover:text-stone-800 dark:group-hover:text-stone-200 transition-colors" />
    </div>
    
    <div>
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1 line-clamp-1 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
        {card.title}
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-1">
        {card.description || 'No description available.'}
      </p>
    </div>
  </div>
);