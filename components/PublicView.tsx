import React, { useState, useMemo, useEffect } from 'react';
import { PublicData, LinkCard } from '../types';
import { Search, Compass, ExternalLink, ArrowUpRight } from 'lucide-react';
import { Modal, Button } from './UI';

interface PublicViewProps {
  data: PublicData;
}

export const PublicView: React.FC<PublicViewProps> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    let cards = data.cards;
    if (selectedCategory !== 'all') cards = cards.filter(c => c.categoryId === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    return cards.sort((a, b) => a.order - b.order);
  }, [data.cards, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Hero Section / Floating Nav */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-4xl">
        <div className="bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem] px-6 py-3 flex items-center justify-between gap-4 dark:bg-slate-900/70 dark:border-white/10 dark:shadow-none">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              {data.settings.icon ? (
                data.settings.icon.startsWith('http') ? <img src={data.settings.icon} className="w-6 h-6 object-contain" /> : <span className="text-xl">{data.settings.icon}</span>
              ) : <Compass size={24} />}
            </div>
            <span className="font-black text-lg tracking-tight hidden sm:block">{data.settings.title}</span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              className="w-full bg-slate-100/50 border-none rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all dark:bg-slate-800/50"
              placeholder="寻找灵感..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Category Pills - Secondary Nav */}
      <nav className="pt-32 pb-8 px-6 overflow-x-auto no-scrollbar flex justify-center gap-3">
        <CategoryPill active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} label="全部分类" />
        {data.categories.sort((a,b) => a.order - b.order).map(cat => (
          <CategoryPill key={cat.id} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} label={cat.name} />
        ))}
      </nav>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredCards.map(card => (
            <CardItem key={card.id} card={card} onClick={() => setConfirmUrl(card.url)} />
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-32 text-center text-slate-400 font-bold uppercase tracking-widest text-sm opacity-50">空空如也</div>
          )}
        </div>
      </main>

      <Modal isOpen={!!confirmUrl} onClose={() => setConfirmUrl(null)} title="传送门">
        <div className="space-y-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">即将前往外部站点，注意安全。</p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-mono text-indigo-600 truncate dark:bg-slate-950 dark:border-slate-800">
            {confirmUrl}
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmUrl(null)}>留在原地</Button>
            <Button className="flex-1" onClick={() => { window.open(confirmUrl!, '_blank'); setConfirmUrl(null); }}>
              立即出发 <ArrowUpRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </Modal>

      <footer className="py-12 text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/50 border border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-900/50 dark:border-white/5">
          Design by NaviLink 2025
        </div>
      </footer>
    </div>
  );
};

const CategoryPill: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all border shrink-0 ${
      active 
        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20 scale-105' 
        : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
    }`}
  >
    {label}
  </button>
);

const CardItem: React.FC<{ card: LinkCard; onClick: () => void }> = ({ card, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_48px_rgba(79,70,229,0.12)] hover:-translate-y-2 hover:border-indigo-400/50 transition-all duration-500 cursor-pointer overflow-hidden dark:bg-slate-900/60 dark:border-white/5"
  >
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full group-hover:bg-indigo-500/20 transition-all duration-500" />
    
    <div className="relative flex flex-col gap-4">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-50 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <img 
          src={card.icon} 
          className="w-10 h-10 object-contain transition-transform duration-500 group-hover:rotate-12"
          onError={e => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=128` }}
        />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{card.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
          {card.description || '无站点描述信息'}
        </p>
      </div>
      <div className="pt-2 flex justify-end">
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 dark:bg-slate-800 dark:text-slate-600">
          <ArrowUpRight size={14} />
        </div>
      </div>
    </div>
  </div>
);