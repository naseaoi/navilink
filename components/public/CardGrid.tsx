import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LinkCard } from '../../types';
import { CachedIcon } from './CachedIcon';

interface CardGridProps {
  cards: LinkCard[];
  selectedCategory: string;
  gridRenderKey: number;
  onCardClick: (card: LinkCard) => void;
}

export const CardGrid: React.FC<CardGridProps> = ({ cards, selectedCategory, gridRenderKey, onCardClick }) => {
  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-8 pb-20 flex-1">
      <div
        key={`${selectedCategory}-${gridRenderKey}`}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
      >
        {cards.map((card, index) => (
          <CardItem
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
            style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
            className="animate-card-enter"
          />
        ))}
        {cards.length === 0 && (
          <div className="col-span-full py-24 text-center animate-card-enter">
            <p className="text-3 text-base">暂无匹配内容</p>
          </div>
        )}
      </div>
    </main>
  );
};

const CardItem: React.FC<{
  card: LinkCard;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}> = ({ card, onClick, style, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    style={style}
    className={`group relative bg-surface border border-subtle rounded-card p-5 text-left flex flex-col gap-4 h-full
      shadow-card hover:shadow-card-hover hover:-translate-y-0.5 hover:border-default
      transition-all duration-300 ease-spring cursor-pointer overflow-hidden ${className}`}
  >
    {/* 顶部:icon 与右上箭头 */}
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-control bg-subtle border border-subtle flex items-center justify-center shrink-0
        group-hover:scale-105 group-hover:bg-accent-soft group-hover:border-accent/30
        transition-all duration-300 ease-spring">
        <CachedIcon
          icon={card.icon}
          siteUrl={card.url}
          alt={card.title}
          className="w-7 h-7 object-contain"
        />
      </div>
      <span className="w-8 h-8 rounded-full flex items-center justify-center text-3
        group-hover:text-accent group-hover:bg-accent-soft transition-colors duration-300">
        <ArrowUpRight size={16} strokeWidth={2.4} />
      </span>
    </div>

    {/* 标题与描述 */}
    <div className="flex-1">
      <h3 className="text-[15px] font-semibold text-1 mb-1 line-clamp-1 tracking-tight-display group-hover:text-accent transition-colors">
        {card.title}
      </h3>
      <p className="text-[13px] text-2 leading-relaxed line-clamp-2">
        {card.description || '暂无描述'}
      </p>
    </div>
  </button>
);
