import React, { useState } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Button, Input } from '../UI';
import { Category, LinkCard, PublicData } from '../../types';

interface CategoriesTabProps {
  data: PublicData;
  onChange: (data: PublicData) => void;
  confirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'primary') => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ data, onChange, confirm }) => {
  const [editId, setEditId] = useState<string | null>(null);
  const [tmpName, setTmpName] = useState('');

  const addCategory = () => {
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: '新分类',
      order: data.categories.length,
    };
    onChange({ ...data, categories: [...data.categories, newCategory] });
  };

  const handleEdit = (category: Category) => {
    setEditId(category.id);
    setTmpName(category.name);
  };

  const handleSave = (id: string) => {
    const updated = data.categories.map((c: Category) => c.id === id ? { ...c, name: tmpName } : c);
    onChange({ ...data, categories: updated });
    setEditId(null);
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
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">分类列表</span>
        <Button variant="secondary" size="sm" onClick={addCategory}><Plus size={16}/> 新增</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.categories.sort((a: Category, b: Category) => a.order - b.order).map((c: Category) => (
          <div key={c.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 dark:bg-stone-900 dark:border-stone-800">
            {editId === c.id ? (
              <>
                <div className="flex-1 min-w-0">
                  <Input autoFocus value={tmpName} onChange={e => setTmpName(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSave(c.id)} />
                </div>
                <Button size="sm" onClick={()=>handleSave(c.id)}>保存</Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-bold text-stone-700 dark:text-stone-300 truncate">{c.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
