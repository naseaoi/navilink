import React from 'react';
import { ArrowUpRight } from 'lucide-react';
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

interface CardGridProps {
  cards: LinkCard[];
  selectedCategory: string;
  gridRenderKey: number;
  onCardClick: (card: LinkCard) => void;
}

export const CardGrid: React.FC<CardGridProps> = ({ cards, selectedCategory, gridRenderKey, onCardClick }) => {
  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-8 pb-20 flex-1">
      <div key={`${selectedCategory}-${gridRenderKey}`} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {cards.map((card, index) => (
          <CardItem
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
            style={{ animationDelay: `${index * 50}ms` }}
            className="animate-card-enter"
          />
        ))}
        {cards.length === 0 && (
          <div className="col-span-full py-24 text-center animate-card-enter">
            <p className="text-stone-400 font-serif italic text-lg">No treasures found.</p>
          </div>
        )}
      </div>
    </main>
  );
};

const CardItem: React.FC<{ card: LinkCard; onClick: () => void; style?: React.CSSProperties; className?: string }> = ({ card, onClick, style, className = '' }) => (
  <div
    onClick={onClick}
    style={style}
    className={`group bg-white dark:bg-[#252220] p-5 rounded-xl border border-stone-100 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-xl hover:shadow-stone-200/50 dark:hover:shadow-none transition-all duration-300 cursor-pointer flex flex-col gap-4 h-full ${className}`}
  >
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
        <img
          src={resolveIconSrc(card.icon)}
          className="w-7 h-7 object-contain opacity-90 group-hover:opacity-100"
          loading="lazy"
          decoding="async"
          onError={(e) => handleIconError(e, card.url)}
          alt={card.title}
        />
      </div>
      <ArrowUpRight size={18} className="text-stone-300 group-hover:text-stone-800 dark:group-hover:text-stone-200 transition-colors" />
    </div>

    <div>
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1 line-clamp-1 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">
        {card.title}
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-1">{card.description || 'No description available.'}</p>
    </div>
  </div>
);
