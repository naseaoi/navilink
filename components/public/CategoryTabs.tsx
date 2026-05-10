import React, { useMemo } from 'react';
import { Category } from '../../types';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, selectedCategory, onSelectCategory }) => {
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);

  return (
    <nav className="pt-6 pb-2 px-4 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 w-max min-w-full">
        <CategoryTab active={selectedCategory === 'all'} onClick={() => onSelectCategory('all')} label="全部" />
        {sortedCategories.map((category) => (
          <CategoryTab
            key={category.id}
            active={selectedCategory === category.id}
            onClick={() => onSelectCategory(category.id)}
            label={category.name}
          />
        ))}
      </div>
    </nav>
  );
};

const CategoryTab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-4 h-9 rounded-control border text-[13.5px] font-medium whitespace-nowrap transition-all duration-200
      ${active
        ? 'bg-surface text-1 border-default shadow-soft'
        : 'bg-transparent text-2 border-transparent hover:text-1 hover:bg-subtle hover:border-subtle'
      }`}
  >
    {label}
  </button>
);
