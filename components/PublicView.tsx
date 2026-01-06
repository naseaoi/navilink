import React, { useState, useMemo } from 'react';
import { PublicData, LinkCard, Category } from '../types';
import { ExternalLink, Search, Compass, Inbox } from 'lucide-react';
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

    if (selectedCategory !== 'all') {
      cards = cards.filter(c => c.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q)
      );
    }

    return cards.sort((a, b) => a.order - b.order);
  }, [data.cards, selectedCategory, searchQuery]);

  const sortedCategories = useMemo(() => {
    return [...data.categories].sort((a, b) => a.order - b.order);
  }, [data.categories]);

  const handleCardClick = (url: string) => {
    setConfirmUrl(url);
  };

  const proceedToLink = () => {
    if (confirmUrl) {
      window.open(confirmUrl, '_blank');
      setConfirmUrl(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 dark:bg-slate-950/80 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {data.settings.icon ? (
               data.settings.icon.startsWith('http') ? 
                 <img src={data.settings.icon} alt="Logo" className="w-8 h-8 rounded-lg object-cover" /> :
                 <span className="text-2xl">{data.settings.icon}</span> 
            ) : (
               <Compass className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            )}
            <h1 className="font-black text-lg text-slate-800 dark:text-slate-100 hidden sm:block tracking-tight">{data.settings.title}</h1>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="搜索链接..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Categories Scroller */}
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto no-scrollbar py-3 flex gap-2">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            全部
          </button>
          {sortedCategories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300 dark:text-slate-700">
            <Inbox className="w-20 h-20 mb-4 opacity-30" />
            <p className="font-bold uppercase tracking-widest text-sm">未找到相关链接</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredCards.map(card => (
              <div 
                key={card.id}
                onClick={() => handleCardClick(card.url)}
                className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-400 transition-all cursor-pointer flex items-start gap-4 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500/50"
              >
                <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                   <img 
                    src={card.icon} 
                    alt={card.title}
                    className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`;
                    }}
                   />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-bold text-slate-900 truncate pr-4 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{card.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed dark:text-slate-400 font-medium">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-800">Powered by NaviLink Console</p>
      </footer>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={!!confirmUrl} 
        onClose={() => setConfirmUrl(null)} 
        title="即将离开本站"
      >
        <div className="space-y-6">
          <p className="text-slate-500 text-sm font-medium dark:text-slate-400">
            正在准备跳转至第三方链接，请确认：
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-[11px] font-mono text-slate-500 break-all border border-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-indigo-400/70">
            {confirmUrl}
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="secondary" onClick={() => setConfirmUrl(null)} className="flex-1">留在本站</Button>
            <Button variant="primary" onClick={proceedToLink} className="flex-1">立即前往 <ExternalLink className="ml-2 w-3 h-3" /></Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};