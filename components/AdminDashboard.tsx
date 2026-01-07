import React, { useState, useEffect, useCallback } from 'react';
import { PublicData, PrivateData, LinkCard, Category } from '../types';
import { webdav } from '../services/webdavService';
import { Button, Input, Select, Modal, Card, PasswordInput, ToastContainer, ToastMessage, ToastType, ConfirmModal } from './UI';
import { Settings, Layout, Layers, LogOut, Plus, Trash2, Edit2, GripVertical, Save, Shield, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  publicData: PublicData;
  privateData: PrivateData;
  onLogout: () => void;
  onUpdatePublic: (d: PublicData) => void;
  onUpdatePrivate: (d: PrivateData) => void;
}

type Tab = 'settings' | 'cards' | 'categories';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ publicData, privateData, onLogout, onUpdatePublic, onUpdatePrivate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [isSaving, setIsSaving] = useState(false);
  
  const [localPublic, setLocalPublic] = useState<PublicData>(publicData);
  const [localPrivate, setLocalPrivate] = useState<PrivateData>(privateData);
  const [hasChanges, setHasChanges] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // Confirm State
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary'}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'primary'
  });

  const confirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, variant });
  };

  useEffect(() => {
    setLocalPublic(publicData);
  }, [publicData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await webdav.savePublicData(localPublic);
      await webdav.savePrivateData(localPrivate);
      onUpdatePublic(localPublic);
      onUpdatePrivate(localPrivate);
      setHasChanges(false);
      showToast('设置保存成功', 'success');
    } catch (error) {
      console.error(error);
      showToast('保存失败，请检查配置', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ToastContainer messages={toasts} onRemove={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen} 
        onClose={() => setConfirmConfig(prev => ({...prev, isOpen: false}))} 
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-slate-900 text-slate-300 flex-col flex-shrink-0 z-30 dark:bg-black dark:border-r dark:border-slate-800">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Shield size={22} />
          </div>
          <div>
            <span className="font-bold text-white block leading-tight">NaviLink</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Admin Console</span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavButton active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<Layout size={20} />} label="卡片管理" />
          <NavButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={20} />} label="分类管理" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="网站设置" />
        </nav>

        <div className="p-6 border-t border-white/5 space-y-3">
          <Button 
            variant="info" 
            className="w-full justify-start py-3 h-auto rounded-xl" 
            onClick={() => navigate('/')}
          >
            <Home size={18} className="mr-2" /> 返回首页
          </Button>
          <Button variant="danger" className="w-full justify-start py-3 h-auto rounded-xl" onClick={onLogout}>
            <LogOut size={18} className="mr-2" /> 退出登录
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative">
        <header className="flex-shrink-0 flex justify-between items-center p-6 md:px-12 md:py-8 bg-white/50 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {activeTab === 'cards' && '卡片管理'}
              {activeTab === 'categories' && '分类管理'}
              {activeTab === 'settings' && '网站设置'}
            </h2>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges} isLoading={isSaving} size="lg" className="px-8 shadow-xl shadow-indigo-600/10">
            <Save size={18} className="mr-2" /> 保存
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
           <div className="max-w-[1600px] mx-auto space-y-8 pb-32">
              {activeTab === 'settings' && (
                <SettingsTab 
                  publicData={localPublic} 
                  privateData={localPrivate}
                  onChangePublic={(d) => { setLocalPublic(d); markChanged(); }}
                  onChangePrivate={(d) => { setLocalPrivate(d); markChanged(); }}
                />
              )}
              {activeTab === 'cards' && (
                <CardsTab 
                  data={localPublic} 
                  onChange={(d) => { setLocalPublic(d); markChanged(); }} 
                  confirm={confirm}
                />
              )}
              {activeTab === 'categories' && (
                <CategoriesTab 
                  data={localPublic} 
                  onChange={(d) => { setLocalPublic(d); markChanged(); }} 
                  confirm={confirm}
                />
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-sm font-bold transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 scale-[1.02]' 
        : 'text-slate-500 hover:text-white hover:bg-white/5 active:scale-95'
    }`}
  >
    {icon}
    {label}
  </button>
);

// --- Sub Tab Components ---

const SettingsTab: React.FC<{ 
  publicData: PublicData; 
  privateData: PrivateData;
  onChangePublic: (d: PublicData) => void;
  onChangePrivate: (d: PrivateData) => void;
}> = ({ publicData, privateData, onChangePublic, onChangePrivate }) => {
  return (
    <div className="grid gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <Card className="p-8">
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
           <Layout size={20} className="text-indigo-500" /> 基本信息
        </h3>
        <div className="space-y-6">
          <Input 
            label="导航标题" 
            placeholder="网站顶部显示的文字"
            value={publicData.settings.title} 
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, title: e.target.value}})} 
          />
          <Input 
            label="站点图标" 
            placeholder="Emoji 如 🚀 或 图片 URL"
            value={publicData.settings.icon} 
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, icon: e.target.value}})} 
          />
        </div>
      </Card>

      <Card className="p-8 border-red-50/50 dark:border-red-900/10">
        <h3 className="text-xl font-black text-red-600 dark:text-red-400 mb-8 flex items-center gap-3">
           <Shield size={20} /> 管理安全
        </h3>
        <div className="space-y-6">
          <Input 
            label="管理员账号" 
            value={privateData.admin.username}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, username: e.target.value}})}
          />
          <PasswordInput 
            label="管理员密码" 
            placeholder="留空则不修改"
            value={privateData.admin.passwordHash}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, passwordHash: e.target.value}})}
          />
        </div>
      </Card>
    </div>
  );
};

const CategoriesTab: React.FC<{ data: PublicData; onChange: (d: PublicData) => void, confirm: any }> = ({ data, onChange, confirm }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const addCategory = () => {
    const newCat: Category = { id: `cat_${Date.now()}`, name: '新分类', order: data.categories.length };
    onChange({ ...data, categories: [...data.categories, newCat] });
  };

  const deleteCategory = (id: string) => {
    confirm('删除分类', '确定要删除该分类吗？', () => {
      onChange({ ...data, categories: data.categories.filter(c => c.id !== id) });
    }, 'danger');
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setTempName(cat.name);
  };

  const saveEdit = (id: string) => {
    onChange({ ...data, categories: data.categories.map(c => c.id === id ? { ...c, name: tempName } : c) });
    setEditingId(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">现有分类列表</p>
        <Button variant="secondary" size="sm" onClick={addCategory} className="rounded-xl"><Plus size={18}/></Button>
      </div>
      <div className="grid gap-3">
        {data.categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all hover:border-indigo-200">
            {editingId === cat.id ? (
              <div className="flex-1 flex flex-row items-center gap-3">
                <div className="flex-1">
                  <Input 
                    autoFocus 
                    value={tempName} 
                    onChange={e => setTempName(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)} 
                  />
                </div>
                <Button size="sm" onClick={() => saveEdit(cat.id)} className="shrink-0">确认</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="shrink-0 text-slate-400">取消</Button>
              </div>
            ) : (
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
            )}
            {!editingId || editingId !== cat.id ? (
              <div className="flex gap-1">
                <button onClick={() => startEdit(cat)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:bg-slate-800 transition-all"><Edit2 size={18}/></button>
                <button onClick={() => deleteCategory(cat.id)} className="p-2.5 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 dark:hover:bg-red-900/20 transition-all"><Trash2 size={18}/></button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

const CardsTab: React.FC<{ data: PublicData; onChange: (d: PublicData) => void, confirm: any }> = ({ data, onChange, confirm }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<LinkCard>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filteredCards = filterCat === 'all' 
    ? data.cards 
    : data.cards.filter(c => c.categoryId === filterCat);

  const sortedCards = [...filteredCards].sort((a, b) => a.order - b.order);

  const updateCardOrder = (newSortedList: LinkCard[]) => {
    const updatedCards = [...data.cards];
    newSortedList.forEach((item, index) => {
      const globalIdx = updatedCards.findIndex(c => c.id === item.id);
      if (globalIdx !== -1) {
        updatedCards[globalIdx] = { ...updatedCards[globalIdx], order: index };
      }
    });
    onChange({ ...data, cards: updatedCards });
  };

  // Improved Real-time Swap Drag Handler
  const onDragStart = (id: string) => {
    setDraggedId(id);
  };

  const onDragEnter = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const newList = [...sortedCards];
    const fromIdx = newList.findIndex(c => c.id === draggedId);
    const toIdx = newList.findIndex(c => c.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [removed] = newList.splice(fromIdx, 1);
      newList.splice(toIdx, 0, removed);
      updateCardOrder(newList);
    }
  };

  const openNew = () => {
    setEditingCard({ id: `card_${Date.now()}`, categoryId: data.categories[0]?.id || '', order: data.cards.length, icon: '', title: '', description: '', url: 'https://' });
    setIsModalOpen(true);
  };

  const openEdit = (card: LinkCard) => {
    setEditingCard({ ...card });
    setIsModalOpen(true);
  };

  const saveCard = () => {
    if (!editingCard.title || !editingCard.url) return;
    let newCards = [...data.cards];
    const existingIndex = newCards.findIndex(c => c.id === editingCard.id);
    if (existingIndex >= 0) newCards[existingIndex] = editingCard as LinkCard;
    else newCards.push(editingCard as LinkCard);
    onChange({ ...data, cards: newCards });
    setIsModalOpen(false);
  };

  const deleteCard = (id: string) => {
    confirm('删除卡片', '确定要永久删除这个导航卡片吗？', () => {
      onChange({ ...data, cards: data.cards.filter(c => c.id !== id) });
    }, 'danger');
  };

  const selectOptions = [
    { value: 'all', label: '显示所有卡片' },
    ...data.categories.map(c => ({ value: c.id, label: c.name }))
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1 md:flex-none md:w-80">
          <Select 
            value={filterCat}
            onChange={(val) => setFilterCat(val)}
            options={selectOptions}
          />
        </div>
        <Button onClick={openNew} size="icon" className="shadow-lg shadow-indigo-600/20 shrink-0">
          <Plus size={24} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4">
        {sortedCards.map((card) => (
          <div 
            key={card.id} 
            draggable
            onDragStart={() => onDragStart(card.id)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => onDragEnter(card.id)}
            onDragEnd={() => setDraggedId(null)}
            className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-indigo-400 hover:shadow-lg transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500 group cursor-grab active:cursor-grabbing ${draggedId === card.id ? 'opacity-30 scale-95 ring-2 ring-indigo-500 ring-offset-2' : ''}`}
          >
            <div className="shrink-0 text-slate-300 dark:text-slate-700 group-hover:text-indigo-400 transition-colors">
              <GripVertical size={18} strokeWidth={2.5} />
            </div>
            
            <div className="w-12 h-12 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 dark:bg-slate-800 dark:border-slate-700 pointer-events-none">
               <img 
                src={card.icon || `https://www.google.com/s2/favicons?domain=${new URL(card.url || 'https://google.com').hostname}&sz=128`} 
                className="w-8 h-8 object-contain" 
                alt="" 
                onError={(e) => {(e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`}} 
              />
            </div>
            
            <div className="flex-1 min-w-0 pointer-events-none">
              <h4 className="font-bold text-sm text-slate-900 truncate dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{card.title}</h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono tracking-tighter opacity-70">{card.url}</p>
              <div className="mt-1.5">
                 <span className="text-[9px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md font-black uppercase tracking-widest border border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                   {data.categories.find(c => c.id === card.categoryId)?.name || '未分类'}
                 </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={(e) => { e.stopPropagation(); openEdit(card); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:bg-slate-800 transition-all"><Edit2 size={16}/></button>
              <button onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 dark:hover:bg-red-900/20 transition-all"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {sortedCards.length === 0 && <div className="text-center text-slate-400 py-16 border-2 border-dashed border-slate-200 rounded-xl col-span-full dark:border-slate-800 font-bold">暂无内容</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard.id?.includes('new') ? "新建导航" : "编辑卡片"}>
        <div className="space-y-6">
          <Input label="显示标题" placeholder="例如: Google" value={editingCard.title || ''} onChange={e => setEditingCard({...editingCard, title: e.target.value})} />
          <Input label="跳转 URL" placeholder="https://..." value={editingCard.url || ''} onChange={e => setEditingCard({...editingCard, url: e.target.value})} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Input label="图标 URL (可选)" placeholder="留空则自动抓取" value={editingCard.icon || ''} onChange={e => setEditingCard({...editingCard, icon: e.target.value})} />
             <Select 
                label="所属分类" 
                value={editingCard.categoryId || ''} 
                onChange={val => setEditingCard({...editingCard, categoryId: val})}
                options={data.categories.map(c => ({ value: c.id, label: c.name }))}
              />
          </div>
          <div className="w-full">
            <label className="mb-1.5 block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">描述摘要</label>
            <textarea className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" rows={2} placeholder="简单描述这个网站..." value={editingCard.description || ''} onChange={e => setEditingCard({...editingCard, description: e.target.value})} />
          </div>
          <div className="pt-6 flex gap-4">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">取消</Button>
             <Button onClick={saveCard} className="flex-1">保存并更新</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};