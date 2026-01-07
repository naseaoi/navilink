import React, { useState, useMemo, useEffect } from 'react';
import { PublicData, LinkCard } from '../types';
import { Search, Compass, ArrowUpRight, Shield, Clock } from 'lucide-react';
import { Modal, Button } from './UI';
import { useNavigate } from 'react-router-dom';

interface PublicViewProps {
  data: PublicData;
}

export const PublicView: React.FC<PublicViewProps> = ({ data }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors duration-500 font-sans selection:bg-indigo-500/10">
      {/* 2025 Mesh Gradient Layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Top Status Bar (Minimal) */}
      <div className={`fixed top-0 left-0 right-0 z-[70] transition-all duration-300 ${scrolled ? 'py-3' : 'py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-slate-900 transition-transform group-hover:rotate-12">
              {data.settings.icon && !data.settings.icon.startsWith('http') ? (
                <span className="text-sm font-bold">{data.settings.icon}</span>
              ) : <Compass size={16} />}
            </div>
            <span className="font-black text-sm tracking-tighter uppercase">{data.settings.title}</span>
          </div>
          
          <div className="hidden sm:flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-2"><Clock size={12}/> {new Date().toLocaleDateString('zh-CN', {month: 'long', day: 'numeric'})}</div>
            <button onClick={() => navigate('/tat')} className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"><Shield size={12}/> Portal</button>
          </div>
        </div>
      </div>

      {/* Hero Content: Spotlight Search */}
      <section className="relative pt-32 pb-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
           {/* The "Spotlight" Input */}
           <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[1.5rem] shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden transition-all group-focus-within:ring-1 group-focus-within:ring-indigo-500/50">
                <Search className="ml-5 text-slate-400" size={20} />
                <input 
                  className="flex-1 bg-transparent border-none px-4 py-5 text-base sm:text-lg focus:ring-0 placeholder:text-slate-400 font-medium"
                  placeholder="搜索资源、文档或工具..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="hidden sm:flex items-center gap-1 mr-5">
                   <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-400 border border-slate-200 dark:border-white/5">⌘</kbd>
                   <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-400 border border-slate-200 dark:border-white/5">K</kbd>
                </div>
              </div>
           </div>

           {/* Quick Dock Categories */}
           <div className="mt-8 flex justify-center">
             <div className="flex flex-wrap justify-center gap-1.5 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-white/5">
                <CategoryPill active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} label="全部" />
                {data.categories.sort((a,b) => a.order - b.order).map(cat => (
                  <CategoryPill key={cat.id} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} label={cat.name} />
                ))}
             </div>
           </div>
        </div>
      </section>

      {/* Grid Content */}
      <main className="max-w-7xl mx-auto px-4 pb-32 animate-in fade-in duration-1000">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
          {filteredCards.map(card => (
            <CardItem key={card.id} card={card} onClick={() => setConfirmUrl(card.url)} />
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300">
              <Search size={48} className="mb-4 opacity-20" />
              <div className="text-xs font-black uppercase tracking-widest opacity-40">找不到任何线索</div>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={!!confirmUrl} onClose={() => setConfirmUrl(null)} title="即刻启程">
        <div className="space-y-4">
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-white/5 text-[10px] font-mono text-indigo-600 break-all leading-relaxed">
            {confirmUrl}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmUrl(null)}>再等等</Button>
            <Button className="flex-1" onClick={() => { window.open(confirmUrl!, '_blank'); setConfirmUrl(null); }}>
              立即出发 <ArrowUpRight className="ml-1" size={14} />
            </Button>
          </div>
        </div>
      </Modal>

      <footer className="py-24 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-100 dark:bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Systems Operational • 2025
        </div>
      </footer>
    </div>
  );
};

const CategoryPill: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border shrink-0 ${
      active 
        ? 'bg-white text-slate-900 border-slate-200 shadow-sm dark:bg-white dark:text-slate-900 dark:border-white' 
        : 'bg-transparent text-slate-500 border-transparent hover:bg-white/50 dark:hover:bg-white/5'
    }`}
  >
    {label}
  </button>
);

const CardItem: React.FC<{ card: LinkCard; onClick: () => void }> = ({ card, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden shadow-sm shadow-slate-200/5 hover:shadow-2xl hover:shadow-indigo-500/5"
  >
    {/* Dynamic gloss flare */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
    
    <div className="relative flex flex-col h-full gap-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-50 dark:border-white/5 transition-transform duration-500 group-hover:rotate-[10deg]">
        <img 
          src={card.icon} 
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
          onError={e => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=128` }}
        />
      </div>
      
      <div className="flex-1">
        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {card.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-medium leading-relaxed opacity-80">
          {card.description || '探索数字宇宙的更多可能'}
        </p>
      </div>

      <div className="flex justify-end opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
         <ArrowUpRight size={14} className="text-indigo-500" />
      </div>
    </div>
  </div>
);