import React, { useState, useEffect, useCallback } from 'react';
import { PublicData, PrivateData, LinkCard, Category } from '../types';
import { webdav } from '../services/webdavService';
import { Button, Input, Select, Modal, Card, PasswordInput, ToastContainer, ToastMessage, ToastType, ConfirmModal } from './UI';
import { Settings, Layout, Layers, LogOut, Plus, Trash2, Edit2, GripVertical, Save, Shield, Home, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'primary' as 'danger'|'primary' });
  const confirm = (title: string, message: string, onConfirm: () => void, variant: 'danger'|'primary' = 'primary') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, variant });
  };

  useEffect(() => { setLocalPublic(publicData); }, [publicData]);

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
      showToast('保存失败', 'error');
    } finally { setIsSaving(false); }
  };

  const markChanged = () => setHasChanges(true);

  // Sidebar Content
  const SidebarContent = () => (
    <>
      <div className="p-8 border-b border-white/5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900 shadow-lg shadow-black/20 shrink-0">
          <Shield size={20} />
        </div>
        <div>
          <span className="font-serif font-bold text-stone-100 block text-lg leading-tight tracking-tight">NaviLink</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">Admin Panel</span>
        </div>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        <NavButton active={activeTab === 'cards'} onClick={() => {setActiveTab('cards'); setIsMobileMenuOpen(false);}} icon={<Layout size={18} />} label="卡片管理" />
        <NavButton active={activeTab === 'categories'} onClick={() => {setActiveTab('categories'); setIsMobileMenuOpen(false);}} icon={<Layers size={18} />} label="分类管理" />
        <NavButton active={activeTab === 'settings'} onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} icon={<Settings size={18} />} label="网站设置" />
      </nav>

      <div className="p-6 border-t border-white/5 space-y-3">
        <Button variant="ghost" className="w-full justify-start py-3 h-auto text-stone-400 hover:text-stone-100 hover:bg-white/5" onClick={() => navigate('/')}>
          <Home size={18} className="mr-3" /> 返回首页
        </Button>
        <Button variant="ghost" className="w-full justify-start py-3 h-auto text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={onLogout}>
          <LogOut size={18} className="mr-3" /> 退出登录
        </Button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#fafaf9] dark:bg-[#1c1917] overflow-hidden font-sans text-stone-800 dark:text-stone-200">
      <ToastContainer messages={toasts} onRemove={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(p=>({...p, isOpen: false}))} 
        onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} variant={confirmConfig.variant}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-[#292524] text-stone-400 flex-col flex-shrink-0 z-30 dark:bg-[#0c0a09] dark:border-r dark:border-stone-800">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 bg-[#292524] text-stone-400 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-300">
             <button className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
             <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-[#fafaf9] dark:bg-[#1c1917]">
        <header className="flex-shrink-0 flex justify-between items-center p-4 md:px-10 md:py-6 bg-[#fafaf9]/80 backdrop-blur-md border-b border-stone-200 dark:bg-[#1c1917]/80 dark:border-stone-800">
          <div className="flex items-center gap-3">
             <button className="md:hidden p-2 -ml-2 text-stone-600 dark:text-stone-300" onClick={() => setIsMobileMenuOpen(true)}>
               <Menu size={24} />
             </button>
             <h2 className="text-xl md:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {activeTab === 'cards' ? 'Cards' : activeTab === 'categories' ? 'Categories' : 'Settings'}
             </h2>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges} 
            isLoading={isSaving} 
            size="icon" 
            className="rounded-full w-12 h-12 shadow-xl shadow-stone-900/10"
            title="保存更改"
          >
            <Save size={20} />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
           <div className="max-w-6xl mx-auto space-y-8 pb-32">
              {activeTab === 'settings' && <SettingsTab dataP={localPublic} dataV={localPrivate} onP={d=>{setLocalPublic(d); markChanged();}} onV={d=>{setLocalPrivate(d); markChanged();}} />}
              {activeTab === 'cards' && <CardsTab data={localPublic} onChange={d=>{setLocalPublic(d); markChanged();}} confirm={confirm} />}
              {activeTab === 'categories' && <CategoriesTab data={localPublic} onChange={d=>{setLocalPublic(d); markChanged();}} confirm={confirm} />}
           </div>
        </div>
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-stone-100 text-stone-900 shadow-lg shadow-black/5' : 'text-stone-500 hover:text-stone-200 hover:bg-white/5'}`}>
    {icon}{label}
  </button>
);

const SettingsTab = ({ dataP, dataV, onP, onV }: any) => (
  <div className="grid gap-8 lg:grid-cols-2">
    <Card className="p-8 space-y-6">
      <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100"><Layout size={18}/> 基础信息</h3>
      <Input label="站点标题" value={dataP.settings.title} onChange={e=>onP({...dataP, settings:{...dataP.settings, title:e.target.value}})} />
      <Input label="站点图标 (Emoji/URL)" value={dataP.settings.icon} onChange={e=>onP({...dataP, settings:{...dataP.settings, icon:e.target.value}})} />
      <Input label="底部文字" value={dataP.settings.footerText || ''} placeholder="© 2025 NaviLink..." onChange={e=>onP({...dataP, settings:{...dataP.settings, footerText:e.target.value}})} />
    </Card>
    <Card className="p-8 border-red-100 dark:border-red-900/20 space-y-6">
      <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-red-700 dark:text-red-400"><Shield size={18}/> 管理账号</h3>
      <Input label="管理员账号" value={dataV.admin.username} onChange={e=>onV({...dataV, admin:{...dataV.admin, username:e.target.value}})} />
      <PasswordInput label="重置密码" placeholder="输入新密码..." onChange={e=>onV({...dataV, admin:{...dataV.admin, passwordHash:e.target.value}})} />
    </Card>
  </div>
);

const CategoriesTab = ({ data, onChange, confirm }: any) => {
  const [editId, setEditId] = useState<string|null>(null);
  const [tmp, setTmp] = useState('');
  const add = () => onChange({...data, categories:[...data.categories, {id:`c${Date.now()}`, name:'新分类', order:data.categories.length}]});
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">分类列表</span>
        <Button variant="secondary" size="sm" onClick={add}><Plus size={16}/> 新增</Button>
      </div>
      {/* Changed to grid-cols-2 */}
      <div className="grid grid-cols-2 gap-3">
        {data.categories.map((c:any) => (
          <div key={c.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 dark:bg-stone-900 dark:border-stone-800">
            {editId === c.id ? <><div className="flex-1 min-w-0"><Input autoFocus value={tmp} onChange={e=>setTmp(e.target.value)} onKeyDown={e=>e.key==='Enter' && (onChange({...data, categories:data.categories.map((x:any)=>x.id===c.id?{...x,name:tmp}:x)}), setEditId(null))} /></div><Button size="sm" onClick={()=>{onChange({...data, categories:data.categories.map((x:any)=>x.id===c.id?{...x,name:tmp}:x)}); setEditId(null);}}>保存</Button></> : <span className="flex-1 font-bold text-stone-700 dark:text-stone-300 truncate">{c.name}</span>}
            {!editId && <div className="flex gap-1"><button onClick={()=>{setEditId(c.id); setTmp(c.name);}} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"><Edit2 size={16}/></button><button onClick={()=>confirm('删除分类','确定删除吗？',()=>onChange({...data, categories:data.categories.filter((x:any)=>x.id!==c.id)}),'danger')} className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const CardsTab = ({ data, onChange, confirm }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<LinkCard>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [draggedId, setDraggedId] = useState<string|null>(null);

  const filtered = filterCat === 'all' ? data.cards : data.cards.filter((c:any) => c.categoryId === filterCat);
  const sorted = [...filtered].sort((a,b) => a.order - b.order);

  const onDragStart = (id: string) => setDraggedId(id);
  const onDragEnter = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const newList = [...sorted];
    const fromIdx = newList.findIndex(c => c.id === draggedId);
    const toIdx = newList.findIndex(c => c.id === targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      const [removed] = newList.splice(fromIdx, 1);
      newList.splice(toIdx, 0, removed);
      const allCards = [...data.cards];
      newList.forEach((item, index) => {
        const globalIdx = allCards.findIndex(c => c.id === item.id);
        if (globalIdx !== -1) allCards[globalIdx] = { ...allCards[globalIdx], order: index };
      });
      onChange({ ...data, cards: allCards });
    }
  };

  const openEdit = (card: LinkCard) => { setEditingCard(card); setIsModalOpen(true); };
  const save = () => {
    if (!editingCard.title || !editingCard.url) return;
    const cards = [...data.cards];
    const idx = cards.findIndex(c => c.id === editingCard.id);
    if (idx >= 0) cards[idx] = editingCard as LinkCard;
    else cards.push(editingCard as LinkCard);
    onChange({ ...data, cards });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Select 
          options={[{value:'all', label:'所有卡片'}, ...data.categories.map((c:any)=>({value:c.id, label:c.name}))]} 
          value={filterCat} 
          onChange={setFilterCat} 
          className="w-full md:w-fit md:min-w-[150px]" 
        />
        <Button onClick={()=>{setEditingCard({id:`card_${Date.now()}`, categoryId:data.categories[0]?.id||'', order:data.cards.length, url:'https://'}); setIsModalOpen(true);}} size="icon" className="rounded-full w-10 h-10"><Plus size={20}/></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {sorted.map(card => (
          <div 
            key={card.id} draggable onDragStart={()=>onDragStart(card.id)} onDragOver={e=>e.preventDefault()} onDragEnter={()=>onDragEnter(card.id)} onDragEnd={()=>setDraggedId(null)}
            className={`group relative bg-white p-4 rounded-xl border border-stone-200 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing hover:border-stone-400 hover:shadow-md hover:shadow-stone-200/50 dark:bg-stone-900 dark:border-stone-800 dark:hover:border-stone-600 ${draggedId === card.id ? 'opacity-30 scale-95 border-dashed' : ''}`}
          >
            <GripVertical size={16} className="text-stone-300 shrink-0" />
            <div className="w-10 h-10 shrink-0 bg-stone-50 rounded-lg flex items-center justify-center border border-stone-100 overflow-hidden dark:bg-stone-800 dark:border-stone-800">
              <img src={card.icon} className="w-6 h-6 object-contain opacity-80 group-hover:opacity-100 transition-opacity" onError={e=>(e.target as any).src=`https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`}/>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 leading-tight break-all">{card.title}</h4>
              {card.description && <p className="text-[10px] text-stone-400 line-clamp-1 leading-relaxed">{card.description}</p>}
              <p className="text-[10px] text-stone-300 font-mono truncate">{new URL(card.url).hostname}</p>
            </div>
            
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-stone-100 dark:border-stone-800">
              <button onClick={()=>openEdit(card)} className="p-1.5 hover:bg-stone-100 rounded-md text-stone-500 hover:text-stone-800"><Edit2 size={12}/></button>
              <button onClick={()=>confirm('删除','确定吗？',()=>onChange({...data, cards:data.cards.filter((x:any)=>x.id!==card.id)}),'danger')} className="p-1.5 hover:bg-red-50 rounded-md text-stone-500 hover:text-red-500"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title="编辑项目">
        <div className="space-y-4">
          <Input label="显示名称" value={editingCard.title||''} onChange={e=>setEditingCard({...editingCard, title:e.target.value})} />
          <Input label="目标 URL" value={editingCard.url||''} onChange={e=>setEditingCard({...editingCard, url:e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="图标 (可选)" value={editingCard.icon||''} onChange={e=>setEditingCard({...editingCard, icon:e.target.value})} />
            <Select label="所属分类" value={editingCard.categoryId||''} onChange={v=>setEditingCard({...editingCard, categoryId:v})} options={data.categories.map((c:any)=>({value:c.id, label:c.name}))} />
          </div>
          <div className="space-y-2">
             <label className="block text-sm font-medium text-stone-600 dark:text-stone-400">描述</label>
             <textarea className="w-full rounded-lg border border-stone-200 p-3 text-sm focus:border-stone-500 focus:outline-none dark:bg-stone-950 dark:border-stone-800 dark:text-stone-100" placeholder="简单描述一下..." rows={2} value={editingCard.description||''} onChange={e=>setEditingCard({...editingCard, description:e.target.value})} />
          </div>
          <div className="pt-4 flex gap-3"><Button variant="secondary" className="flex-1" onClick={()=>setIsModalOpen(false)}>取消</Button><Button className="flex-1" onClick={save}>保存</Button></div>
        </div>
      </Modal>
    </div>
  );
};