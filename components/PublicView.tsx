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
                 <img src={data.settings.icon} alt="Logo" className="w-8 h-8 rounded object-cover" /> :
                 <span className="text-2xl">{data.settings.icon}</span> 
            ) : (
               <Compass className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            )}
            <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 hidden sm:block">{data.settings.title}</h1>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="搜索链接..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Categories Scroller */}
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto no-scrollbar py-3 flex gap-2">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all' 
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            全部
          </button>
          {sortedCategories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
            <Inbox className="w-16 h-16 mb-4 opacity-50" />
            <p>未找到相关链接</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCards.map(card => (
              <div 
                key={card.id}
                onClick={() => handleCardClick(card.url)}
                className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex items-start gap-4 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700"
              >
                <div className="w-12 h-12 shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                   {/* Fallback icon handling */}
                   <img 
                    src={card.icon} 
                    alt={card.title}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`;
                    }}
                   />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate pr-4 dark:text-slate-100">{card.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed dark:text-slate-400">{card.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 dark:text-slate-600" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-400 dark:text-slate-600">
        <p>Powered by NaviLink</p>
      </footer>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={!!confirmUrl} 
        onClose={() => setConfirmUrl(null)} 
        title="即将离开"
      >
        <div className="space-y-4">
          <p className="text-slate-600 text-sm dark:text-slate-300">
            您即将访问外部网站，是否继续跳转至：
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 break-all border border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
            {confirmUrl}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setConfirmUrl(null)}>取消</Button>
            <Button variant="primary" onClick={proceedToLink}>继续访问 <ExternalLink className="ml-2 w-3 h-3" /></Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};