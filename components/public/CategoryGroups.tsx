import React, { useMemo } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Category, LinkCard } from '../../types';
import { CachedIcon } from './CachedIcon';
import { categoryPath, getCategoryIcon, sortCategories } from './categoryIcons';

const PREVIEW_COUNT = 4;

interface CategoryGroupsProps {
  categories: Category[];
  cards: LinkCard[];
  onCardClick: (card: LinkCard) => void;
}

export const CategoryGroups: React.FC<CategoryGroupsProps> = ({ categories, cards, onCardClick }) => {
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);
  const cardsByCategory = useMemo(() => {
    const map = new Map<string, LinkCard[]>();
    for (const card of cards) {
      const list = map.get(card.categoryId) ?? [];
      list.push(card);
      map.set(card.categoryId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [cards]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {sortedCategories.map((category, index) => (
        <GroupCard
          key={category.id}
          category={category}
          Icon={getCategoryIcon(index)}
          cards={cardsByCategory.get(category.id) ?? []}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
};

const GroupCard: React.FC<{
  category: Category;
  Icon: LucideIcon;
  cards: LinkCard[];
  onCardClick: (card: LinkCard) => void;
}> = ({ category, Icon, cards, onCardClick }) => {
  const navigate = useNavigate();
  const visibleCards = cards.slice(0, PREVIEW_COUNT);

  return (
    <section className="flex flex-col rounded-3xl border border-subtle bg-surface p-6 shadow-soft transition-colors duration-300 hover:border-default md:p-7">
      <button
        type="button"
        onClick={() => navigate(categoryPath(category.id))}
        className="group/header mb-6 flex w-full items-center justify-between text-left"
        aria-label={`查看分类 ${category.name}`}
      >
        <span className="flex items-center gap-3">
          <Icon size={20} strokeWidth={2.2} className="text-accent" />
          <span className="text-[15.5px] font-semibold tracking-tight-display text-1 transition-colors group-hover/header:text-accent">
            {category.name}
          </span>
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-3 transition-colors group-hover/header:bg-accent-soft group-hover/header:text-accent">
          <ChevronRight size={18} strokeWidth={2.4} />
        </span>
      </button>

      {cards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-[13px] text-3">暂无内容</div>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {visibleCards.map((card) => (
            <SiteItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </div>
      )}
    </section>
  );
};

const SiteItem: React.FC<{ card: LinkCard; onClick: () => void }> = ({ card, onClick }) => (
  <button type="button" onClick={onClick} className="group flex min-w-0 flex-col items-center gap-2.5" title={card.title}>
    <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-subtle bg-surface shadow-soft transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-card">
      <CachedIcon icon={card.icon} siteUrl={card.url} alt={card.title} className="h-1/2 w-1/2 object-contain" />
    </div>
    <span className="w-full truncate text-center text-[12.5px] text-2 transition-colors group-hover:text-accent">{card.title}</span>
  </button>
);
