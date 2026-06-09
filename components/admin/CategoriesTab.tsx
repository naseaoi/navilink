import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../UI';
import { Category, LinkCard, PublicData } from '../../types';
import { CATEGORY_ICON_OPTIONS, getCategoryIcon, getCategoryIconValue } from '../public/categoryIcons';

interface CategoriesTabProps {
  data: PublicData;
  onChange: (data: PublicData) => void;
  confirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'primary') => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ data, onChange, confirm }) => {
  const [editId, setEditId] = useState<string | null>(null);
  const [tmpName, setTmpName] = useState('');
  const [tmpIcon, setTmpIcon] = useState(CATEGORY_ICON_OPTIONS[0].value);
  const [activeIconPickerId, setActiveIconPickerId] = useState<string | null>(null);
  const sortedCategories = useMemo(
    () => [...data.categories].sort((a, b) => a.order - b.order),
    [data.categories]
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-category-icon-picker]')) setActiveIconPickerId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const addCategory = () => {
    const icon = getCategoryIconValue(data.categories.length);
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: '新分类',
      icon,
      order: data.categories.length,
    };
    onChange({ ...data, categories: [...data.categories, newCategory] });
    setEditId(newCategory.id);
    setTmpName(newCategory.name);
    setTmpIcon(icon);
  };

  const handleEdit = (category: Category) => {
    setEditId(category.id);
    setTmpName(category.name);
    setTmpIcon(category.icon || getCategoryIconValue(sortedCategories.findIndex((item) => item.id === category.id)));
    setActiveIconPickerId(null);
  };

  const handleSave = (id: string) => {
    const updated = data.categories.map((c: Category) => c.id === id ? { ...c, name: tmpName, icon: tmpIcon } : c);
    onChange({ ...data, categories: updated });
    setEditId(null);
    setActiveIconPickerId(null);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setActiveIconPickerId(null);
  };

  const handleDelete = (id: string) => {
    confirm('删除分类', '您确定要删除这个分类吗？分类下的所有卡片也会被移除。', () => {
      const updatedCats = data.categories.filter((c: Category) => c.id !== id);
      const updatedCards = data.cards.filter((card: LinkCard) => card.categoryId !== id);
      onChange({ ...data, categories: updatedCats, cards: updatedCards });
    }, 'danger');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-3 uppercase tracking-widest">分类列表</span>
        <Button variant="secondary" size="sm" onClick={addCategory}><Plus size={16}/> 新增</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedCategories.map((c: Category, index) => {
          const isEditing = editId === c.id;
          const Icon = getCategoryIcon(isEditing ? { ...c, icon: tmpIcon } : c, index);
          return (
          <div key={c.id} className="relative flex items-center gap-3 p-4 bg-surface-raised rounded-card border border-subtle shadow-soft">
            <div className="relative shrink-0" data-category-icon-picker>
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setActiveIconPickerId(activeIconPickerId === c.id ? null : c.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent transition-colors hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent/25"
                  aria-label={`选择 ${c.name} 图标`}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </button>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
              )}
              {isEditing && activeIconPickerId === c.id && (
                <IconPicker value={tmpIcon} onChange={(value) => { setTmpIcon(value); setActiveIconPickerId(null); }} />
              )}
            </div>
            {isEditing ? (
              <input
                autoFocus
                value={tmpName}
                onChange={e => setTmpName(e.target.value)}
                onKeyDown={e=>e.key==='Enter' && handleSave(c.id)}
                className="h-9 min-w-0 flex-1 rounded-control border border-subtle bg-surface px-3 text-[13.5px] font-semibold text-1 transition-all duration-200 placeholder:text-3 hover:border-default focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
                aria-label="分类名称"
              />
            ) : (
                <span className="flex-1 font-semibold text-1 truncate">{c.name}</span>
            )}
            <div className="flex gap-1">
              {isEditing ? (
                <>
                  <button aria-label={`确认 ${c.name}`} onClick={() => handleSave(c.id)} className="p-2 hover:bg-subtle rounded-md text-3 hover:text-1 transition-colors"><Check size={16}/></button>
                  <button aria-label={`取消 ${c.name}`} onClick={handleCancelEdit} className="p-2 hover:bg-subtle rounded-md text-3 hover:text-1 transition-colors"><X size={16}/></button>
                </>
              ) : (
                <>
                  <button aria-label={`编辑 ${c.name}`} onClick={() => handleEdit(c)} className="p-2 hover:bg-subtle rounded-md text-3 hover:text-1 transition-colors"><Edit2 size={16}/></button>
                  <button aria-label={`删除 ${c.name}`} onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-md text-3 hover:text-red-500 transition-colors dark:hover:bg-red-950/30"><Trash2 size={16}/></button>
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

const IconPicker: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <div className="absolute left-0 top-[calc(100%+8px)] z-50 grid w-[244px] grid-cols-5 gap-2 rounded-control border border-subtle bg-surface-raised p-2 shadow-popover">
    {CATEGORY_ICON_OPTIONS.map(({ value: optionValue, label, Icon }) => {
      const selected = value === optionValue;
      return (
        <button
          key={optionValue}
          type="button"
          title={label}
          aria-label={`选择${label}图标`}
          aria-pressed={selected}
          onClick={() => onChange(optionValue)}
          className={`flex h-9 w-9 items-center justify-center rounded-control border transition-colors ${
            selected
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-subtle bg-surface text-3 hover:border-default hover:bg-subtle hover:text-1'
          }`}
        >
          <Icon size={17} strokeWidth={2.2} />
        </button>
      );
    })}
  </div>
);
