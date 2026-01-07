import React, { useState, useMemo } from 'react';
import { PublicData, LinkCard } from '../types';
import { Search, Compass, ArrowUpRight } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors duration-500 font-sans selection:bg-indigo-500/20">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating Island Header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-5xl">
        <div className="bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-3xl px-4 py-2.5 flex items-center justify-between gap-3 dark:bg-slate-900/60 dark:border-white/10">
          <div className="flex items-center gap-2.5 shrink-0 pl-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              {data.settings.icon ? (
                data.settings.icon.startsWith('http') ? <img src={data.settings.icon} className="w-5 h-5 object-contain" /> : <span className="text-lg">{data.settings.icon}</span>
              ) : <Compass size={20} />}
            </div>
            <span className="font-black text-base tracking-tighter hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {data.settings.title}
            </span>
          </div>

          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              className="w-full bg-slate-200/30 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all dark:bg-slate-800/50 dark:placeholder:text-slate-500"
              placeholder="搜索资源..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Category Navigation - Minimal & Clean */}
      <nav className="pt-24 pb-6 px-4 flex justify-start sm:justify-center overflow-x-auto no-scrollbar gap-2 z-10 relative">
        <CategoryPill active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} label="全部分类" />
        {data.categories.sort((a,b) => a.order - b.order).map(cat => (
          <CategoryPill key={cat.id} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} label={cat.name} />
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 pb-24 z-10 relative">
        {/* Mobile 2-column, Desktop responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
          {filteredCards.map(card => (
            <CardItem key={card.id} card={card} onClick={() => setConfirmUrl(card.url)} />
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <div className="text-slate-300 dark:text-slate-700 font-black text-4xl mb-2">404</div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">没有找到相关资源</div>
            </div>
          )}
        </div>
      </main>

      {/* Exit Modal */}
      <Modal isOpen={!!confirmUrl} onClose={() => setConfirmUrl(null)} title="跳转确认">
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">即将离开站点</p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-mono text-indigo-600 break-all dark:bg-slate-950 dark:border-slate-800">
            {confirmUrl}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1 text-xs" onClick={() => setConfirmUrl(null)}>取消</Button>
            <Button className="flex-1 text-xs" onClick={() => { window.open(confirmUrl!, '_blank'); setConfirmUrl(null); }}>
              前往 <ArrowUpRight className="ml-1" size={14} />
            </Button>
          </div>
        </div>
      </Modal>

      <footer className="py-12 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Powered by NaviLink • 2025 Edition
        </p>
      </footer>
    </div>
  );
};

const CategoryPill: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
      active 
        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950 dark:border-white' 
        : 'bg-white/40 text-slate-500 border-white hover:border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-white/5'
    }`}
  >
    {label}
  </button>
);

const CardItem: React.FC<{ card: LinkCard; onClick: () => void }> = ({ card, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative bg-white/50 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 hover:border-indigo-400/30 transition-all duration-500 cursor-pointer overflow-hidden dark:bg-slate-900/50 dark:border-white/5 dark:hover:border-indigo-500/30"
  >
    {/* Subtle gloss effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full" />
    
    <div className="relative flex flex-col gap-3 sm:gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center border border-slate-50 shadow-sm dark:bg-slate-800 dark:border-slate-700 shrink-0">
        <img 
          src={card.icon} 
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-500 group-hover:scale-110"
          onError={e => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=128` }}
        />
      </div>
      
      <div className="min-w-0">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {card.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-2 mt-1 font-medium leading-tight">
          {card.description || '探索更多精彩内容'}
        </p>
      </div>

      <div className="flex justify-between items-center mt-auto pt-1 sm:pt-2">
         <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 uppercase tracking-tighter dark:bg-slate-800 dark:text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">
           Secure Link
         </span>
         <ArrowUpRight size={14} className="text-slate-200 group-hover:text-indigo-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </div>
  </div>
);