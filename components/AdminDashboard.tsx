import React, { useState, useEffect } from 'react';
import { PublicData, PrivateData, LinkCard, Category } from '../types';
import { webdav } from '../services/webdavService';
import { Button, Input, Select, Modal, Card } from './UI';
import { Settings, Layout, Layers, LogOut, Plus, Trash2, Edit2, GripVertical, Save, Shield } from 'lucide-react';

interface AdminDashboardProps {
  publicData: PublicData;
  privateData: PrivateData;
  onLogout: () => void;
  onUpdatePublic: (d: PublicData) => void;
  onUpdatePrivate: (d: PrivateData) => void;
}

type Tab = 'settings' | 'cards' | 'categories';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ publicData, privateData, onLogout, onUpdatePublic, onUpdatePrivate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [isSaving, setIsSaving] = useState(false);
  
  const [localPublic, setLocalPublic] = useState<PublicData>(publicData);
  const [localPrivate, setLocalPrivate] = useState<PrivateData>(privateData);
  const [hasChanges, setHasChanges] = useState(false);

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
      alert('保存成功！数据已同步至 WebDAV。');
    } catch (error) {
      console.error(error);
      alert('保存失败。请检查：\n1. Vercel 环境变量配置\n2. WebDAV 应用密码是否正确\n3. 文件夹名是否有特殊字符');
    } finally {
      setIsSaving(false);
    }
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0 z-30 dark:bg-black dark:border-r dark:border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center text-white font-bold">
            <Shield size={18} />
          </div>
          <span className="font-semibold text-white">管理后台</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavButton active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<Layout size={18} />} label="卡片管理" />
          <NavButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={18} />} label="分类管理" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="网站设置" />
        </nav>
        <div className="p-4 border-t border-slate-800">
           {hasChanges && (
            <div className="mb-4 p-3 bg-indigo-900/50 rounded-lg border border-indigo-500/30 text-[10px] text-indigo-200 text-center uppercase tracking-wider animate-pulse">
              待保存
            </div>
          )}
          <Button variant="danger" className="w-full justify-start" onClick={onLogout}>
            <LogOut size={18} className="mr-2" /> 退出登录
          </Button>
        </div>
      </aside>

      {/* Mobile Top Nav */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
           <Shield size={20} className="text-indigo-400" />
           <span className="font-bold">管理后台</span>
        </div>
        <div className="flex gap-2">
           <Button size="sm" variant="ghost" className="text-white" onClick={onLogout}><LogOut size={16}/></Button>
        </div>
      </div>
      
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 z-20 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('cards')} className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'cards' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>卡片</button>
        <button onClick={() => setActiveTab('categories')} className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'categories' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>分类</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>设置</button>
      </div>

      {/* Main Content Area - Ensuring full height and scrolling */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative">
        <header className="flex-shrink-0 flex justify-between items-center p-6 md:p-8 bg-white/60 backdrop-blur-md dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeTab === 'cards' && '卡片管理'}
              {activeTab === 'categories' && '分类管理'}
              {activeTab === 'settings' && '网站设置'}
            </h2>
          </div>
          <div className="flex-shrink-0">
            <Button onClick={handleSave} disabled={!hasChanges} isLoading={isSaving} size="md">
              <Save size={18} className="md:mr-2" /> 
              <span className="hidden md:inline">保存更改</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
           <div className="max-w-4xl mx-auto space-y-6 pb-20">
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
                />
              )}
              {activeTab === 'categories' && (
                <CategoriesTab 
                  data={localPublic} 
                  onChange={(d) => { setLocalPublic(d); markChanged(); }} 
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
        : 'hover:bg-slate-800 text-slate-400 hover:text-white dark:hover:bg-slate-800'
    }`}
  >
    {icon}
    {label}
  </button>
);

// --- Sub Components ---

const SettingsTab: React.FC<{ 
  publicData: PublicData; 
  privateData: PrivateData;
  onChangePublic: (d: PublicData) => void;
  onChangePrivate: (d: PrivateData) => void;
}> = ({ publicData, privateData, onChangePublic, onChangePrivate }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100">
           <Compass size={20} className="text-indigo-500" />
           <h3 className="text-lg font-bold">通用配置</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Input 
            label="导航标题" 
            value={publicData.settings.title} 
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, title: e.target.value}})} 
          />
          <Input 
            label="站点图标 (图片 URL 或 Emoji)" 
            value={publicData.settings.icon} 
            placeholder="例如: https://... 或 🧭"
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, icon: e.target.value}})} 
          />
        </div>
      </Card>

      <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100">
           <Shield size={20} className="text-indigo-500" />
           <h3 className="text-lg font-bold">安全管理</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Input 
            label="后台登录用户名" 
            value={privateData.admin.username}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, username: e.target.value}})}
          />
          <Input 
            label="后台登录密码" 
            type="password"
            placeholder="留空则保持原样"
            value={privateData.admin.passwordHash}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, passwordHash: e.target.value}})}
          />
        </div>
      </Card>
    </div>
  );
};

const CategoriesTab: React.FC<{ data: PublicData; onChange: (d: PublicData) => void }> = ({ data, onChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const addCategory = () => {
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name: '新分类',
      order: data.categories.length
    };
    onChange({ ...data, categories: [...data.categories, newCat] });
  };

  const deleteCategory = (id: string) => {
    if (confirm('确定要删除这个分类吗？分类内的卡片将不会显示，直到您将其移动到其他分类。')) {
      onChange({ ...data, categories: data.categories.filter(c => c.id !== id) });
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setTempName(cat.name);
  };

  const saveEdit = (id: string) => {
    onChange({
      ...data,
      categories: data.categories.map(c => c.id === id ? { ...c, name: tempName } : c)
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-slate-500">分类决定了首页的侧边栏/顶栏显示顺序</p>
        <Button variant="secondary" size="sm" onClick={addCategory}><Plus size={16}/></Button>
      </div>
      <div className="grid gap-3">
        {data.categories.sort((a,b) => a.order - b.order).map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <GripVertical className="text-slate-300 dark:text-slate-700" size={18} />
            {editingId === cat.id ? (
              <div className="flex-1 flex gap-2">
                <Input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)} />
                <Button size="sm" onClick={() => saveEdit(cat.id)}>确认</Button>
              </div>
            ) : (
              <span className="flex-1 font-semibold text-slate-700 dark:text-slate-200">{cat.name}</span>
            )}
            <div className="flex gap-1">
              <button onClick={() => startEdit(cat)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:bg-slate-800"><Edit2 size={16}/></button>
              <button onClick={() => deleteCategory(cat.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CardsTab: React.FC<{ data: PublicData; onChange: (d: PublicData) => void }> = ({ data, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<LinkCard>>({});
  const [filterCat, setFilterCat] = useState('all');

  const filteredCards = filterCat === 'all' 
    ? data.cards 
    : data.cards.filter(c => c.categoryId === filterCat);

  const openNew = () => {
    setEditingCard({
      id: `card_${Date.now()}`,
      categoryId: data.categories[0]?.id || '',
      order: 0,
      icon: '',
      title: '',
      description: '',
      url: 'https://'
    });
    setIsModalOpen(true);
  };

  const openEdit = (card: LinkCard) => {
    setEditingCard({ ...card });
    setIsModalOpen(true);
  };

  const saveCard = () => {
    if (!editingCard.title || !editingCard.url) return alert("请填写标题和链接地址");
    
    let newCards = [...data.cards];
    const existingIndex = newCards.findIndex(c => c.id === editingCard.id);
    
    if (existingIndex >= 0) {
      newCards[existingIndex] = editingCard as LinkCard;
    } else {
      newCards.push(editingCard as LinkCard);
    }
    
    onChange({ ...data, cards: newCards });
    setIsModalOpen(false);
  };

  const deleteCard = (id: string) => {
    if (confirm('确认删除？')) {
      onChange({ ...data, cards: data.cards.filter(c => c.id !== id) });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Select 
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="w-full sm:w-64 bg-white dark:bg-slate-900 shadow-sm"
        >
          <option value="all">查看全部卡片</option>
          {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button onClick={openNew} className="w-full sm:w-auto shadow-md"><Plus size={16} className="mr-1"/> 添加卡片</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredCards.map(card => (
          <div key={card.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-400 hover:shadow-lg transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500">
            <div className="w-14 h-14 shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
               <img 
                src={card.icon || `https://www.google.com/s2/favicons?domain=${new URL(card.url || 'https://google.com').hostname}&sz=128`} 
                className="w-10 h-10 object-contain" 
                alt="" 
                onError={(e) => {(e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`}} 
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 truncate dark:text-slate-100">{card.title}</h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{card.url}</p>
              <div className="mt-2 flex items-center">
                 <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold dark:bg-slate-800 dark:text-slate-400">
                   {data.categories.find(c => c.id === card.categoryId)?.name || '未分类'}
                 </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => openEdit(card)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:bg-slate-800"><Edit2 size={16}/></button>
              <button onClick={() => deleteCard(card.id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {filteredCards.length === 0 && <div className="text-center text-slate-400 py-16 border-2 border-dashed border-slate-200 rounded-3xl col-span-full dark:border-slate-800">暂无内容，点击上方按钮创建。</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard.id?.includes('new') ? "新建卡片" : "编辑卡片"}>
        <div className="space-y-5">
          <Input 
            label="显示名称" 
            placeholder="例如: GitHub"
            value={editingCard.title || ''} 
            onChange={e => setEditingCard({...editingCard, title: e.target.value})} 
          />
          <Input 
            label="链接地址 (URL)" 
            placeholder="https://..."
            value={editingCard.url || ''} 
            onChange={e => setEditingCard({...editingCard, url: e.target.value})} 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input 
              label="图标 URL (可选)" 
              placeholder="留空自动抓取"
              value={editingCard.icon || ''} 
              onChange={e => setEditingCard({...editingCard, icon: e.target.value})} 
            />
            <Select 
                label="分类归属"
                value={editingCard.categoryId}
                onChange={e => setEditingCard({...editingCard, categoryId: e.target.value})}
              >
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase dark:text-slate-400">描述信息</label>
            <textarea 
               className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
               rows={2}
               placeholder="简单介绍一下这个网站..."
               value={editingCard.description || ''}
               onChange={e => setEditingCard({...editingCard, description: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="px-6">取消</Button>
             <Button onClick={saveCard} className="px-10 shadow-lg shadow-indigo-500/20">保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Compass = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
);