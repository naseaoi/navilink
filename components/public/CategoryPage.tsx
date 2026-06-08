import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { LinkCard } from '../../types';
import { CachedIcon } from './CachedIcon';
import { usePublicOutlet } from '../PublicView';
import { getCategoryIcon, sortCategories } from './categoryIcons';

export const CategoryPage: React.FC = () => {
  const { categoryId } = useParams();
  const { data, onCardClick } = usePublicOutlet();

  const sorted = sortCategories(data.categories);
  const index = sorted.findIndex((c) => c.id === categoryId);
  const category = index >= 0 ? sorted[index] : undefined;

  if (!category) return <Navigate to="/" replace />;

  const Icon = getCategoryIcon(index);
  const cards = data.cards.filter((c) => c.categoryId === category.id).sort((a, b) => a.order - b.order);

  return (
    <>
      <div className="pt-2 md:pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-2 transition-colors hover:text-accent"
        >
          <ArrowLeft size={15} strokeWidth={2.2} />
          返回首页
        </Link>

        <div className="mt-5 flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight-display text-1">{category.name}</h1>
            <p className="mt-0.5 text-[13px] text-3">{cards.length} 个站点</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {cards.length === 0 ? (
          <div className="py-24 text-center text-[14px] text-3">该分类暂无内容</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card, i) => (
              <CardItem
                key={card.id}
                card={card}
                onClick={() => onCardClick(card)}
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />
    </>
  );
};

const CardItem: React.FC<{ card: LinkCard; onClick: () => void; style?: React.CSSProperties }> = ({ card, onClick, style }) => (
  <button
    type="button"
    onClick={onClick}
    style={style}
    className="animate-card-enter group flex h-full flex-col gap-4 overflow-hidden rounded-card border border-subtle bg-surface p-5 text-left shadow-card transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-default hover:shadow-card-hover"
  >
    <div className="flex items-start justify-between">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-subtle bg-subtle transition-all duration-300 ease-spring group-hover:border-accent/30 group-hover:bg-accent-soft">
        <CachedIcon icon={card.icon} siteUrl={card.url} alt={card.title} className="h-7 w-7 object-contain" />
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-3 transition-colors group-hover:bg-accent-soft group-hover:text-accent">
        <ArrowUpRight size={16} strokeWidth={2.4} />
      </span>
    </div>
    <div className="flex-1">
      <h3 className="mb-1 line-clamp-1 text-[15px] font-semibold tracking-tight-display text-1 transition-colors group-hover:text-accent">
        {card.title}
      </h3>
      <p className="line-clamp-2 text-[13px] leading-relaxed text-2">{card.description || '暂无描述'}</p>
    </div>
  </button>
);
