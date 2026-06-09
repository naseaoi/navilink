import React, { useEffect, useState } from 'react';
import { Edit2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '../UI';
import { LinkCard, PublicData } from '../../types';
import { CachedIcon } from '../public/CachedIcon';

interface CardsTabProps {
  data: PublicData;
  onChange: (data: PublicData) => void;
  confirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'primary') => void;
}

export const CardsTab: React.FC<CardsTabProps> = ({ data, onChange, confirm }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<LinkCard>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filtered = filterCat === 'all' ? data.cards : data.cards.filter((card) => card.categoryId === filterCat);
  const sorted = [...filtered].sort((a, b) => a.order - b.order);
  const categoryOptions = data.categories.map((category) => ({ value: category.id, label: category.name }));

  const reorderCards = (targetId?: string) => {
    if (!draggedId) return data.cards;
    const scope = [...sorted];
    const fromIndex = scope.findIndex((card) => card.id === draggedId);
    if (fromIndex === -1) return data.cards;
    const targetIndex = targetId ? scope.findIndex((card) => card.id === targetId) : fromIndex;
    if (targetIndex === -1) return data.cards;
    const [moved] = scope.splice(fromIndex, 1);
    scope.splice(targetIndex, 0, moved);
    const orderById = new Map(scope.map((card, index) => [card.id, index]));
    return data.cards.map((card) => orderById.has(card.id) ? { ...card, order: orderById.get(card.id)! } : card);
  };

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const onDragStart = (id: string) => setDraggedId(id);

  const onDragEnter = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    onChange({ ...data, cards: reorderCards(targetId) });
  };

  const handleTouchStart = (_e: React.TouchEvent, id: string) => {
    setDraggedId(id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedId) return;

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = target?.closest('[data-card-id]');

    if (cardEl) {
      const targetId = cardEl.getAttribute('data-card-id');
      if (targetId && targetId !== draggedId) {
        onDragEnter(targetId);
      }
    }
  };

  const handleTouchEnd = () => {
    onChange({ ...data, cards: reorderCards() });
    setDraggedId(null);
  };

  const openEdit = (card: LinkCard) => { setEditingCard(card); setIsModalOpen(true); };

  const save = () => {
    if (!editingCard.title || !editingCard.url) return;
    const cards = [...data.cards];
    const idx = cards.findIndex(c => c.id === editingCard.id);

    if (idx >= 0) {
      cards[idx] = editingCard as LinkCard;
    } else {
      const maxOrder = Math.max(...cards.map(c => c.order), -1);
      cards.push({ ...editingCard, order: maxOrder + 1 } as LinkCard);
    }
    onChange({ ...data, cards });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    confirm('删除卡片', '您确定要删除这张卡片吗？', () => {
      onChange({ ...data, cards: data.cards.filter((c: LinkCard) => c.id !== id) });
    }, 'danger');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Select 
          options={[{value:'all', label:'所有卡片'}, ...categoryOptions]} 
          value={filterCat} 
          onChange={setFilterCat} 
          className="w-auto min-w-[120px] max-w-[50%]" 
        />
        <Button onClick={()=>{setEditingCard({id:`card_${Date.now()}`, categoryId:data.categories[0]?.id||'', url:'https://'}); setIsModalOpen(true);}} size="icon" className="rounded-control w-10 h-10 shrink-0" title="新增卡片"><Plus size={20}/></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-x-6 gap-y-6">
        {sorted.map(card => (
          <div 
            key={card.id} 
            data-card-id={card.id}
            onDragOver={e=>e.preventDefault()} 
            onDragEnter={()=>onDragEnter(card.id)} 
            onClick={(e) => {
              e.stopPropagation();
              if (draggedId) return;
              setActiveMenuId(activeMenuId === card.id ? null : card.id);
            }}
            className={`group relative bg-surface-raised pl-1.5 pr-24 py-4 rounded-card border border-subtle flex items-center gap-2.5 transition-all hover:border-default hover:shadow-card ${draggedId === card.id ? 'opacity-30 scale-95 border-dashed' : ''} ${activeMenuId === card.id ? 'border-default shadow-card ring-2 ring-accent/10' : ''}`}
          >
            <div 
              draggable 
              onDragStart={()=>onDragStart(card.id)} 
              onDragEnd={handleTouchEnd}
              onTouchStart={(e) => handleTouchStart(e, card.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 text-3 hover:text-2 touch-none shrink-0"
            >
              <GripVertical size={10} />
            </div>

            <div className="w-10 h-10 shrink-0 bg-subtle rounded-control flex items-center justify-center border border-subtle overflow-hidden group-hover:scale-105 transition-transform duration-300">
              <CachedIcon
                icon={card.icon}
                siteUrl={card.url}
                className="w-6 h-6 object-contain opacity-80 group-hover:opacity-100 transition-opacity" 
                alt={card.title}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
              <h4 className="font-semibold text-base text-1 leading-tight truncate">{card.title}</h4>
              {card.description && <p className="text-xs text-2 truncate leading-tight">{card.description}</p>}
              <p className="text-[10px] text-3 truncate opacity-80">
                {(() => { try { return new URL(card.url).hostname } catch { return card.url } })()}
              </p>
            </div>
            
            <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 transition-all ${activeMenuId === card.id ? 'opacity-100 translate-x-0 visible' : 'opacity-0 translate-x-1 invisible group-hover:opacity-100 group-hover:translate-x-0 group-hover:visible'}`} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e)=>{ e.stopPropagation(); openEdit(card); }} 
                className="flex h-8 w-8 items-center justify-center rounded-control border border-subtle bg-surface-raised text-2 shadow-soft hover:border-default hover:bg-subtle hover:text-1"
                aria-label={`编辑 ${card.title}`}
              >
                <Edit2 size={14}/>
              </button>
              <button 
                onClick={(e)=>{ e.stopPropagation(); handleDelete(card.id); }} 
                className="flex h-8 w-8 items-center justify-center rounded-control border border-subtle bg-surface-raised text-2 shadow-soft hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-900/40 dark:hover:bg-red-950/30"
                aria-label={`删除 ${card.title}`}
              >
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title={editingCard.id?.startsWith('card_') ? "编辑项目" : "新增项目"}>
        <div className="space-y-4">
          <Input label="显示名称" value={editingCard.title||''} onChange={e=>setEditingCard({...editingCard, title:e.target.value})} />
          <Input label="目标 URL" value={editingCard.url||''} onChange={e=>setEditingCard({...editingCard, url:e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="图标 (可选)" placeholder="留空自动获取" value={editingCard.icon||''} onChange={e=>setEditingCard({...editingCard, icon:e.target.value})} />
            <Select label="所属分类" value={editingCard.categoryId||''} onChange={v=>setEditingCard({...editingCard, categoryId:v})} options={categoryOptions} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-2">描述</label>
            <textarea className="w-full rounded-control border border-subtle bg-surface p-3 text-sm text-1 placeholder:text-3 hover:border-default focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none" placeholder="简单描述一下..." rows={2} value={editingCard.description||''} onChange={e=>setEditingCard({...editingCard, description:e.target.value})} />
          </div>
          <div className="pt-4 flex gap-3"><Button variant="secondary" className="flex-1" onClick={()=>setIsModalOpen(false)}>取消</Button><Button className="flex-1" onClick={save}>保存</Button></div>
        </div>
      </Modal>
    </div>
  );
};
