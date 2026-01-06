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
  
  // Local state for editing to avoid frequent fetches
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
      alert('保存失败，请检查网络或配置。');
    } finally {
      setIsSaving(false);
    }
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row dark:bg-slate-950">
      {/* Sidebar - Fixed width on desktop, flexible on mobile */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col md:h-screen md:sticky md:top-0 z-10 dark:bg-black dark:border-r dark:border-slate-800">
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

      {/* Main Content - Flex-1 and min-w-0 are crucial for responsive grid inside flex container */}
      <main className="flex-1 flex flex-col h-[calc(100vh-theme(spacing.16))] md:h-screen overflow-hidden min-w-0">
        <header className="flex-shrink-0 flex justify-between items-center p-4 md:p-8 bg-slate-100 dark:bg-slate-950 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize dark:text-slate-100">
              {activeTab === 'cards' && '卡片管理'}
              {activeTab === 'categories' && '分类管理'}
              {activeTab === 'settings' && '网站设置'}
            </h2>
            <p className="text-slate-500 text-sm dark:text-slate-400">管理您的导航站内容</p>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges} isLoading={isSaving}>
            <Save size={18} className="mr-2" /> 保存更改
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0">
           <div className="max-w-5xl mx-auto pb-20">
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
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2 dark:border-slate-800 dark:text-slate-100">基本信息</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input 
            label="网站标题" 
            value={publicData.settings.title} 
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, title: e.target.value}})} 
          />
          <Input 
            label="网站图标 (图片链接)" 
            value={publicData.settings.icon} 
            placeholder="https://..."
            onChange={(e) => onChangePublic({...publicData, settings: {...publicData.settings, icon: e.target.value}})} 
          />
        </div>
      </Card>

      <Card className="p-6 border-red-100 dark:border-red-900/30">
        <h3 className="text-lg font-semibold mb-4 border-b border-red-100 pb-2 text-red-600 dark:border-red-900/30">管理员安全</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input 
            label="管理员账号" 
            value={privateData.admin.username}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, username: e.target.value}})}
          />
          <Input 
            label="新密码" 
            type="password"
            placeholder="输入新密码以修改"
            value={privateData.admin.passwordHash}
            onChange={(e) => onChangePrivate({...privateData, admin: {...privateData.admin, passwordHash: e.target.value}})}
          />
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">注意：演示模式下密码未加密存储，请确保您的WebDAV环境安全。</p>
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
    if (confirm('确定删除该分类吗？分类下的卡片将被隐藏，直到移动到其他分类。')) {
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
    <Card className="p-6">
      <div className="flex justify-between mb-4">
        <h3 className="font-semibold dark:text-slate-100">分类列表</h3>
        <Button variant="secondary" onClick={addCategory}><Plus size={16} className="mr-1"/> 添加</Button>
      </div>
      <div className="space-y-2">
        {data.categories.sort((a,b) => a.order - b.order).map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 group dark:bg-slate-800 dark:border-slate-700">
            <GripVertical className="text-slate-400 cursor-move" size={16} />
            {editingId === cat.id ? (
              <div className="flex-1 flex gap-2">
                <Input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} />
                <Button variant="primary" onClick={() => saveEdit(cat.id)}>确定</Button>
              </div>
            ) : (
              <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{cat.name}</span>
            )}
            <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEdit(cat)} className="p-2 hover:bg-white rounded text-blue-600 dark:hover:bg-slate-700"><Edit2 size={16}/></button>
              <button onClick={() => deleteCategory(cat.id)} className="p-2 hover:bg-white rounded text-red-600 dark:hover:bg-slate-700"><Trash2 size={16}/></button>
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
    if (!editingCard.title || !editingCard.url) return alert("标题和URL为必填项");
    
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
    if (confirm('确定删除此卡片吗？')) {
      onChange({ ...data, cards: data.cards.filter(c => c.id !== id) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Select 
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="min-w-[150px]"
        >
          <option value="all">所有分类</option>
          {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button onClick={openNew}><Plus size={16} className="mr-1"/> 新建卡片</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCards.map(card => (
          <div key={card.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500/50">
            <div className="w-10 h-10 shrink-0">
               <img src={card.icon} className="w-10 h-10 rounded bg-slate-50 object-cover dark:bg-slate-700" alt="" onError={(e) => {(e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(card.url).hostname}&sz=64`}} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-800 truncate dark:text-slate-100">{card.title}</h4>
              <p className="text-xs text-slate-500 truncate dark:text-slate-400">{card.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 hidden sm:inline-block dark:bg-slate-900 dark:text-slate-400 max-w-[80px] truncate">
                {data.categories.find(c => c.id === card.categoryId)?.name || '未知分类'}
              </span>
              <button onClick={() => openEdit(card)} className="p-2 hover:bg-slate-100 rounded text-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"><Edit2 size={16}/></button>
              <button onClick={() => deleteCard(card.id)} className="p-2 hover:bg-red-50 rounded text-red-500 dark:hover:bg-red-900/20"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {filteredCards.length === 0 && <p className="text-center text-slate-400 py-8 col-span-full">该分类下没有卡片。</p>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard.id ? "编辑卡片" : "新建卡片"}>
        <div className="space-y-4">
          <Input 
            label="标题" 
            value={editingCard.title || ''} 
            onChange={e => setEditingCard({...editingCard, title: e.target.value})} 
          />
          <Input 
            label="链接 URL" 
            value={editingCard.url || ''} 
            onChange={e => setEditingCard({...editingCard, url: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
             <Input 
              label="图标 URL" 
              value={editingCard.icon || ''} 
              onChange={e => setEditingCard({...editingCard, icon: e.target.value})} 
            />
            <Select 
                label="分类"
                value={editingCard.categoryId}
                onChange={e => setEditingCard({...editingCard, categoryId: e.target.value})}
              >
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="w-full">
            <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase dark:text-slate-400">描述</label>
            <textarea 
               className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
               rows={3}
               value={editingCard.description || ''}
               onChange={e => setEditingCard({...editingCard, description: e.target.value})}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>取消</Button>
             <Button onClick={saveCard}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};