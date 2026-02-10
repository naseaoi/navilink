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
    <nav className="pt-8 pb-4 px-6 max-w-7xl mx-auto overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-8 border-b border-stone-200 dark:border-stone-800 w-max min-w-full px-2">
        <CategoryTab active={selectedCategory === 'all'} onClick={() => onSelectCategory('all')} label="全部" />
        {sortedCategories.map((category) => (
          <CategoryTab key={category.id} active={selectedCategory === category.id} onClick={() => onSelectCategory(category.id)} label={category.name} />
        ))}
      </div>
    </nav>
  );
};

const CategoryTab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-4 px-2 text-base font-medium transition-all relative whitespace-nowrap ${
      active ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
    }`}
  >
    {label}
    {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 dark:bg-stone-100 rounded-full" />}
  </button>
);
