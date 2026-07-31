import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, GripVertical, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '../UI';
import { LinkCard, PublicData } from '../../types';
import { CachedIcon } from '../public/CachedIcon';

interface CardsTabProps {
  data: PublicData;
  onChange: (data: PublicData) => void;
  confirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'primary') => void;
}

const PREVIEW_URL_PATH = '/navilink-preview/';
const MAX_PREVIEW_COUNT = 60;
const PAGE_SIZE = 100;

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isPreviewCard = (card: LinkCard) => {
  try {
    const parsed = new URL(card.url);
    return parsed.hostname === 'example.com' && parsed.pathname.startsWith(PREVIEW_URL_PATH) && card.title.startsWith('预览卡片 ');
  } catch {
    return false;
  }
};

export const CardsTab: React.FC<CardsTabProps> = ({ data, onChange, confirm }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<LinkCard>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [previewCount, setPreviewCount] = useState(12);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const dragOrderRef = useRef<string[] | null>(null);
  const dragChangedRef = useRef(false);

  const filtered = useMemo(
    () => filterCat === 'all' ? data.cards : data.cards.filter((card) => card.categoryId === filterCat),
    [data.cards, filterCat]
  );
  const baseSorted = useMemo(() => [...filtered].sort((a, b) => a.order - b.order), [filtered]);
  const sorted = useMemo(() => {
    if (!dragOrder) return baseSorted;
    const cardsById = new Map(baseSorted.map((card) => [card.id, card]));
    return dragOrder.map((id) => cardsById.get(id)).filter((card): card is LinkCard => !!card);
  }, [baseSorted, dragOrder]);
  const categoryOptions = useMemo(
    () => data.categories.map((category) => ({ value: category.id, label: category.name })),
    [data.categories]
  );
  const invalidCards = useMemo(
    () => data.cards.filter((card) => !isHttpUrl(card.url) || (card.icon?.trim() && !isHttpUrl(card.icon.trim()))),
    [data.cards]
  );
  const previewCards = useMemo(() => data.cards.filter(isPreviewCard), [data.cards]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageCards = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const applyCardOrder = (order: string[]) => {
    const orderById = new Map(order.map((id, index) => [id, index]));
    return data.cards.map((card) => orderById.has(card.id) ? { ...card, order: orderById.get(card.id)! } : card);
  };

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPage(0);
  }, [filterCat]);

  const beginDrag = (id: string) => {
    const order = baseSorted.map((card) => card.id);
    dragOrderRef.current = order;
    dragChangedRef.current = false;
    setDragOrder(order);
    setDraggedId(id);
  };

  const onDragEnter = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const order = [...(dragOrderRef.current || baseSorted.map((card) => card.id))];
    const fromIndex = order.indexOf(draggedId);
    const targetIndex = order.indexOf(targetId);
    if (fromIndex === -1 || targetIndex === -1) return;
    order.splice(targetIndex, 0, order.splice(fromIndex, 1)[0]);
    dragOrderRef.current = order;
    dragChangedRef.current = true;
    setDragOrder(order);
  };

  const handleTouchStart = (_e: React.TouchEvent, id: string) => {
    beginDrag(id);
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
    if (dragOrderRef.current && dragChangedRef.current) {
      onChange({ ...data, cards: applyCardOrder(dragOrderRef.current) });
    }
    dragOrderRef.current = null;
    dragChangedRef.current = false;
    setDragOrder(null);
    setDraggedId(null);
  };

  const openEdit = (card: LinkCard) => { setEditingCard(card); setIsModalOpen(true); };

  const addPreviewCards = () => {
    if (!data.categories.length) return;
    const count = Math.min(Math.max(Math.trunc(previewCount) || 1, 1), MAX_PREVIEW_COUNT);
    const stamp = Date.now();
    const maxOrder = Math.max(...data.cards.map((card) => card.order), -1);
    const nextCards = Array.from({ length: count }, (_, index) => ({
      id: `preview_${stamp}_${index}`,
      categoryId: data.categories[Math.floor(Math.random() * data.categories.length)].id,
      title: `预览卡片 ${String(index + 1).padStart(2, '0')}`,
      description: ['效率工具', '内容收藏', '项目入口', '设计参考'][index % 4],
      url: `https://example.com${PREVIEW_URL_PATH}${stamp}-${index + 1}`,
      icon: '',
      order: maxOrder + index + 1
    }));
    onChange({ ...data, cards: [...data.cards, ...nextCards] });
  };

  const removePreviewCards = () => {
    if (!previewCards.length) return;
    confirm('删除预览卡片', `将删除 ${previewCards.length} 张预览卡片。`, () => {
      onChange({ ...data, cards: data.cards.filter((card) => !isPreviewCard(card)) });
    }, 'danger');
  };

  const removeInvalidCards = () => {
    if (!invalidCards.length) return;
    confirm('删除无效卡片', `将删除 ${invalidCards.length} 张 URL 或图标无效的卡片。`, () => {
      const invalidIds = new Set(invalidCards.map((card) => card.id));
      onChange({ ...data, cards: data.cards.filter((card) => !invalidIds.has(card.id)) });
    }, 'danger');
  };

  const save = () => {
    if (!editingCard.title || !editingCard.url || !isHttpUrl(editingCard.url)) return;
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
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Select 
          options={[{value:'all', label:'所有卡片'}, ...categoryOptions]} 
          value={filterCat} 
          onChange={setFilterCat} 
          className="w-full min-w-[150px] sm:w-auto" 
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <Input
              label="预览数量"
              type="number"
              min={1}
              max={MAX_PREVIEW_COUNT}
              value={previewCount}
              onChange={(event) => setPreviewCount(Number(event.target.value))}
            />
          </div>
          <Button onClick={addPreviewCards} variant="secondary" className="h-11 gap-2">
            <Sparkles size={16} /> 新增预览
          </Button>
          <Button onClick={removePreviewCards} variant="secondary" disabled={!previewCards.length} className="h-11">
            清理预览
          </Button>
          <Button onClick={removeInvalidCards} variant="danger" disabled={!invalidCards.length} className="h-11">
            清理无效
          </Button>
          <Button onClick={()=>{setEditingCard({id:`card_${Date.now()}`, categoryId:data.categories[0]?.id||'', url:''}); setIsModalOpen(true);}} size="icon" className="rounded-control w-11 h-11 shrink-0" title="新增卡片"><Plus size={20}/></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-x-6 gap-y-6">
        {pageCards.map(card => (
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
              onDragStart={()=>beginDrag(card.id)}
              onDragEnd={handleTouchEnd}
              onTouchStart={(e) => handleTouchStart(e, card.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 text-3 hover:text-2 touch-none shrink-0"
            >
              <GripVertical size={16} />
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

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            disabled={page === 0 || !!draggedId}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            title="上一页"
          >
            <ChevronLeft size={17} />
          </Button>
          <span className="min-w-16 text-center text-xs font-medium text-2">{page + 1} / {pageCount}</span>
          <Button
            variant="secondary"
            size="icon"
            disabled={page >= pageCount - 1 || !!draggedId}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            title="下一页"
          >
            <ChevronRight size={17} />
          </Button>
        </div>
      )}

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
