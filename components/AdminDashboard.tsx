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

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ToastContainer messages={toasts} onRemove={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(p=>({...p, isOpen: false}))} 
        onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} variant={confirmConfig.variant}
      />

      <aside className="hidden md:flex w-72 bg-slate-900 text-slate-300 flex-col flex-shrink-0 z-30 dark:bg-black dark:border-r dark:border-slate-800">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg">
            <Shield size={22} />
          </div>
          <div>
            <span className="font-black text-white block leading-tight">NaviLink</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Admin</span>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <NavButton active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<Layout size={20} />} label="卡片管理" />
          <NavButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={20} />} label="分类管理" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="网站设置" />
        </nav>

        <div className="p-6 border-t border-white/5 space-y-3">
          <Button variant="info" className="w-full justify-start py-3 h-auto" onClick={() => navigate('/')}>
            <Home size={18} className="mr-2" /> 返回首页
          </Button>
          <Button variant="danger" className="w-full justify-start py-3 h-auto" onClick={onLogout}>
            <LogOut size={18} className="mr-2" /> 退出
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        <header className="flex-shrink-0 flex justify-between items-center p-6 md:px-12 md:py-8 bg-white/50 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">
            {activeTab === 'cards' ? '卡片管理' : activeTab === 'categories' ? '分类管理' : '网站设置'}
          </h2>
          <Button onClick={handleSave} disabled={!hasChanges} isLoading={isSaving} size="lg" className="px-8 shadow-xl">
            <Save size={18} className="mr-2" /> 保存
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
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
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
    {icon}{label}
  </button>
);

const SettingsTab = ({ dataP, dataV, onP, onV }: any) => (
  <div className="grid gap-8 lg:grid-cols-2">
    <Card className="p-8 space-y-6">
      <h3 className="text-lg font-black flex items-center gap-2"><Layout size={18} className="text-indigo-500"/> 基础信息</h3>
      <Input label="站点标题" value={dataP.settings.title} onChange={e=>onP({...dataP, settings:{...dataP.settings, title:e.target.value}})} />
      <Input label="站点图标 (Emoji/URL)" value={dataP.settings.icon} onChange={e=>onP({...dataP, settings:{...dataP.settings, icon:e.target.value}})} />
    </Card>
    <Card className="p-8 border-red-50 space-y-6">
      <h3 className="text-lg font-black flex items-center gap-2"><Shield size={18} className="text-red-500"/> 管理账号</h3>
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
    <div className="space-y-4">
      <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">分类列表</span><Button variant="secondary" size="sm" onClick={add}><Plus size={16}/></Button></div>
      <div className="grid gap-3">
        {data.categories.map((c:any) => (
          <div key={c.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            {editId === c.id ? <><div className="flex-1"><Input autoFocus value={tmp} onChange={e=>setTmp(e.target.value)} onKeyDown={e=>e.key==='Enter' && (onChange({...data, categories:data.categories.map((x:any)=>x.id===c.id?{...x,name:tmp}:x)}), setEditId(null))} /></div><Button size="sm" onClick={()=>{onChange({...data, categories:data.categories.map((x:any)=>x.id===c.id?{...x,name:tmp}:x)}); setEditId(null);}}>存</Button></> : <span className="flex-1 font-bold">{c.name}</span>}
            {!editId && <div className="flex gap-1"><button onClick={()=>{setEditId(c.id); setTmp(c.name);}} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><Edit2 size={16}/></button><button onClick={()=>confirm('删除分类','确定删除吗？',()=>onChange({...data, categories:data.categories.filter((x:any)=>x.id!==c.id)}),'danger')} className="p-2 hover:bg-red-50 rounded-xl text-slate-400"><Trash2 size={16}/></button></div>}
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
      <div className="flex items-center justify-between gap-6">
        <Select options={[{value:'all', label:'显示所有卡片'}, ...data.categories.map((c:any)=>({value:c.id, label:c.name}))]} value={filterCat} onChange={setFilterCat} className="md:w-64" />
        <Button onClick={()=>{setEditingCard({id:`card_${Date.now()}`, categoryId:data.categories[0]?.id||'', order:data.cards.length, url:'https://'}); setIsModalOpen(true);}} size="icon"><Plus size={20}/></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {sorted.map(card => (
          <div 
            key={card.id} draggable onDragStart={()=>onDragStart(card.id)} onDragOver={e=>e.preventDefault()} onDragEnter={()=>onDragEnter(card.id)} onDragEnd={()=>setDraggedId(null)}
            className={`group bg-white p-3 rounded-2xl border border-slate-100 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:bg-slate-900 dark:border-slate-800 ${draggedId === card.id ? 'opacity-20 scale-95' : ''}`}
          >
            <GripVertical size={16} className="text-slate-300 shrink-0" />
            <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
              <img src={card.icon} className="w-6 h-6 object-contain" onError={e=>(e.target as any).src=`https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`}/>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs truncate group-hover:text-indigo-600 transition-colors">{card.title}</h4>
              <p className="text-[9px] text-slate-400 truncate opacity-60">{card.url}</p>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
              <button onClick={()=>openEdit(card)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Edit2 size={14}/></button>
              <button onClick={()=>confirm('删除','确定吗？',()=>onChange({...data, cards:data.cards.filter((x:any)=>x.id!==card.id)}),'danger')} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400"><Trash2 size={14}/></button>
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
          <textarea className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-4 focus:ring-indigo-500/5 outline-none dark:bg-slate-950 dark:border-slate-800" placeholder="简单描述一下..." rows={2} value={editingCard.description||''} onChange={e=>setEditingCard({...editingCard, description:e.target.value})} />
          <div className="pt-4 flex gap-3"><Button variant="secondary" className="flex-1" onClick={()=>setIsModalOpen(false)}>取消</Button><Button className="flex-1" onClick={save}>保存</Button></div>
        </div>
      </Modal>
    </div>
  );
};