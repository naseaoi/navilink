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
      alert('保存成功！');
    } catch (error) {
      console.error(error);
      alert('保存失败，请检查环境变量配置。');
    } finally {
      setIsSaving(false);
    }
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col md:h-screen md:sticky md:top-0 z-20 dark:bg-black dark:border-r dark:border-slate-800">
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
            <div className="mb-4 p-3 bg-indigo-900/50 rounded-lg border border-indigo-500/30 text-xs text-indigo-200 text-center animate-pulse">
              您有未保存的更改
            </div>
          )}
          <Button variant="danger" className="w-full justify-start" onClick={onLogout}>
            <LogOut size={18} className="mr-2" /> 退出登录
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50 dark:bg-slate-950">
        <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 md:p-8 gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize dark:text-slate-100">
              {activeTab === 'cards' && '卡片管理'}
              {activeTab === 'categories' && '分类管理'}
              {activeTab === 'settings' && '网站设置'}
            </h2>
            <p className="text-slate-500 text-sm dark:text-slate-400">配置您的个性化导航内容</p>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges} isLoading={isSaving} className="w-full sm:w-auto">
            <Save size={18} className="mr-2" /> 保存更改
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-5xl mx-auto space-y-8 pb-24">
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white dark:hover:bg-slate-800'
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 border-b border-slate-100 pb-2 dark:border-slate-800 dark:text-slate-100">站点信息</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <Input 
            label="网站标题" 
            value={publicData.settings.title} 
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, title: e.target.value}})} 
          />
          <Input 
            label="网站图标 (链接或Emoji)" 
            value={publicData.settings.icon} 
            placeholder="https://... 或 🚀"
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, icon: e.target.value}})} 
          />
        </div>
      </Card>

      <Card className="p-6 border-red-100 dark:border-red-900/30">
        <h3 className="text-lg font-semibold mb-6 border-b border-red-100 pb-2 text-red-600 dark:border-red-900/30">安全中心</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <Input 
            label="管理员用户名" 
            value={privateData.admin.username}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, username: e.target.value}})}
          />
          <Input 
            label="管理员密码" 
            type="password"
            placeholder="建议使用强密码"
            value={privateData.admin.passwordHash}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, passwordHash: e.target.value}})}
          />
        </div>
        <div className="mt-4 p-4 bg-slate-50 rounded-lg dark:bg-slate-800/50">
           <p className="text-xs text-slate-500 dark:text-slate-400">
             提示：数据加密通过 WebDAV 服务商保障。本应用目前在 public.json/private.json 中存储配置。
           </p>
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
    if (confirm('确认删除？该分类下的链接将暂时失效。')) {
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
    <Card className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold dark:text-slate-100">分类管理</h3>
        <Button variant="secondary" size="sm" onClick={addCategory}><Plus size={16} className="mr-1"/> 添加分类</Button>
      </div>
      <div className="space-y-3">
        {data.categories.sort((a,b) => a.order - b.order).map((cat) => (
          <div key={cat.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm group dark:bg-slate-900 dark:border-slate-800">
            <GripVertical className="text-slate-300 dark:text-slate-600" size={18} />
            {editingId === cat.id ? (
              <div className="flex-1 flex gap-2">
                <Input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)} />
                <Button onClick={() => saveEdit(cat.id)}>保存</Button>
              </div>
            ) : (
              <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{cat.name}</span>
            )}
            <div className="flex gap-2">
              <button onClick={() => startEdit(cat)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:bg-slate-800"><Edit2 size={16}/></button>
              <button onClick={() => deleteCategory(cat.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
      icon: 'https://picsum.photos/64',
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
    if (!editingCard.title || !editingCard.url) return alert("请填写完整信息");
    
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Select 
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="w-full sm:w-64"
        >
          <option value="all">显示全部</option>
          {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button onClick={openNew} className="w-full sm:w-auto"><Plus size={16} className="mr-1"/> 新建卡片</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {filteredCards.map(card => (
          <div key={card.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-400 hover:shadow-md transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500">
            <div className="w-12 h-12 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
               <img 
                src={card.icon} 
                className="w-8 h-8 object-contain" 
                alt="" 
                onError={(e) => {(e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`}} 
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 truncate dark:text-slate-100">{card.title}</h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{card.url}</p>
              <div className="mt-2 flex items-center gap-2">
                 <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium dark:bg-indigo-900/30 dark:text-indigo-300">
                   {data.categories.find(c => c.id === card.categoryId)?.name || '未分类'}
                 </span>
              </div>
            </div>
            <div className="flex gap-1 self-start">
              <button onClick={() => openEdit(card)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:bg-slate-800"><Edit2 size={16}/></button>
              <button onClick={() => deleteCard(card.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {filteredCards.length === 0 && <div className="text-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-2xl col-span-full dark:border-slate-800">该分类下暂无内容。</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard.id?.includes('new') ? "新建卡片" : "编辑卡片"}>
        <div className="space-y-5">
          <Input 
            label="卡片名称" 
            placeholder="例如: Google"
            value={editingCard.title || ''} 
            onChange={e => setEditingCard({...editingCard, title: e.target.value})} 
          />
          <Input 
            label="链接地址" 
            placeholder="https://..."
            value={editingCard.url || ''} 
            onChange={e => setEditingCard({...editingCard, url: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
             <Input 
              label="图标 URL" 
              placeholder="Favicon 链接"
              value={editingCard.icon || ''} 
              onChange={e => setEditingCard({...editingCard, icon: e.target.value})} 
            />
            <Select 
                label="所属分类"
                value={editingCard.categoryId}
                onChange={e => setEditingCard({...editingCard, categoryId: e.target.value})}
              >
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="w-full">
            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase dark:text-slate-400">简短描述</label>
            <textarea 
               className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
               rows={3}
               placeholder="描述这个链接..."
               value={editingCard.description || ''}
               onChange={e => setEditingCard({...editingCard, description: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>取消</Button>
             <Button onClick={saveCard} className="px-8">保存卡片</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};