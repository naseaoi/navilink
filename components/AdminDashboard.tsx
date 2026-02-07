import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PublicData, PrivateData } from '../types';
import { webdav } from '../services/webdavService';
import { Button, ToastContainer, ToastMessage, ToastType, ConfirmModal } from './UI';
import { Settings, Layout, Layers, LogOut, Save, Shield, Home, Menu, X, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsTab } from './admin/SettingsTab';
import { CardsTab } from './admin/CardsTab';
import { CategoriesTab } from './admin/CategoriesTab';
import { StorageTab } from './admin/StorageTab';

interface AdminDashboardProps {
  publicData: PublicData;
  privateData: PrivateData;
  onLogout: () => void;
  onUpdatePublic: (d: PublicData) => void;
  onUpdatePrivate: (d: PrivateData) => void;
}

type Tab = 'settings' | 'cards' | 'categories' | 'storage';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ publicData, privateData, onLogout, onUpdatePublic, onUpdatePrivate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [isSaving, setIsSaving] = useState(false);
  const [localPublic, setLocalPublic] = useState<PublicData>(publicData);
  const [localPrivate, setLocalPrivate] = useState<PrivateData>(privateData);
  const [hasChanges, setHasChanges] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [storageMode, setStorageMode] = useState<'local' | 'webdav'>('local');
  const [storageAvailable, setStorageAvailable] = useState<{ local: boolean; webdav: boolean }>({ local: true, webdav: false });
  const [storageStatus, setStorageStatus] = useState<{ local: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; webdav: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; available: { local: boolean; webdav: boolean } } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [syncing, setSyncing] = useState<'none' | 'localToWebdav' | 'webdavToLocal'>('none');

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

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const info = await webdav.getStorageMode();
        setStorageMode(info.mode);
        setStorageAvailable(info.available);
        const status = await webdav.getStorageStatus();
        setStorageStatus(status);
      } catch (error) {
        showToast('获取存储信息失败', 'error');
      }
    };
    loadStorage();
  }, [showToast]);

  const refreshRemoteData = async () => {
    const pub = await webdav.fetchPublicData();
    const priv = await webdav.fetchPrivateData();
    setLocalPublic(pub);
    setLocalPrivate(priv);
    onUpdatePublic(pub);
    onUpdatePrivate(priv);
    setHasChanges(false);
  };

  const refreshStorageStatus = async () => {
    try {
      const status = await webdav.getStorageStatus();
      setStorageStatus(status);
    } catch (error) {
      showToast('获取存储状态失败', 'error');
    }
  };

  const handleStorageModeChange = async (mode: 'local' | 'webdav') => {
    setStorageLoading(true);
    try {
      const info = await webdav.setStorageMode(mode);
      setStorageMode(info.mode);
      setStorageAvailable(info.available);
      await refreshRemoteData();
      await refreshStorageStatus();
      showToast('存储模式已切换', 'success');
    } catch (error) {
      showToast('切换存储模式失败', 'error');
    } finally {
      setStorageLoading(false);
    }
  };

  const handleStorageSync = (from: 'local' | 'webdav', to: 'local' | 'webdav') => {
    const labelFrom = from === 'webdav' ? 'WebDAV' : '本地';
    const labelTo = to === 'webdav' ? 'WebDAV' : '本地';
    confirm(
      '覆盖数据',
      `将用 ${labelFrom} 数据覆盖 ${labelTo}，此操作不可撤销。`,
      async () => {
        setSyncing(from === 'webdav' ? 'webdavToLocal' : 'localToWebdav');
        try {
          await webdav.syncStorage(from, to);
          await refreshRemoteData();
          await refreshStorageStatus();
          showToast('数据同步完成', 'success');
        } catch (error) {
          showToast('数据同步失败', 'error');
        } finally {
          setSyncing('none');
        }
      },
      'danger'
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await webdav.savePublicData(localPublic);
      await webdav.savePrivateData(localPrivate);
      onUpdatePublic(localPublic);
      onUpdatePrivate(localPrivate);
      setHasChanges(false);
      await refreshStorageStatus();
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
        <NavButton active={activeTab === 'storage'} onClick={() => {setActiveTab('storage'); setIsMobileMenuOpen(false);}} icon={<Database size={18} />} label="数据存储" />
      </nav>

      <div className="p-6 border-t border-white/5 space-y-2">
        <FooterButton onClick={() => navigate('/')} icon={<Home size={18} />} label="返回首页" />
        <FooterButton onClick={onLogout} icon={<LogOut size={18} />} label="退出登录" tone="danger" />
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col md:flex-row bg-[#fafaf9] dark:bg-[#1c1917] overflow-hidden font-sans text-stone-800 dark:text-stone-200">
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

      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#fafaf9] dark:bg-[#1c1917]">
        <header className="flex-shrink-0 flex justify-between items-center p-4 md:px-10 md:py-6 bg-[#fafaf9]/80 backdrop-blur-md border-b border-stone-200 dark:bg-[#1c1917]/80 dark:border-stone-800">
          <div className="flex items-center gap-3">
             <button className="md:hidden p-2 -ml-2 text-stone-600 dark:text-stone-300" onClick={() => setIsMobileMenuOpen(true)}>
               <Menu size={24} />
             </button>
            <h2 className="text-xl md:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
             {activeTab === 'cards' ? 'Cards' : activeTab === 'categories' ? 'Categories' : activeTab === 'storage' ? 'Storage' : 'Settings'}
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

        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-10 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
           <div className="max-w-7xl mx-auto space-y-8 pb-32">
              {activeTab === 'settings' && (
                <SettingsTab 
                  dataP={localPublic} 
                  dataV={localPrivate} 
                  onP={d=>{setLocalPublic(d); markChanged();}} 
                  onV={d=>{setLocalPrivate(d); markChanged();}}
                />
              )}
              {activeTab === 'cards' && <CardsTab data={localPublic} onChange={d=>{setLocalPublic(d); markChanged();}} confirm={confirm} />}
              {activeTab === 'categories' && <CategoriesTab data={localPublic} onChange={d=>{setLocalPublic(d); markChanged();}} confirm={confirm} />}
              {activeTab === 'storage' && (
                <StorageTab
                  storageMode={storageMode}
                  storageAvailable={storageAvailable}
                  storageStatus={storageStatus}
                  onChangeMode={handleStorageModeChange}
                  onSync={handleStorageSync}
                  isLoading={storageLoading}
                  syncing={syncing}
                />
              )}
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

const FooterButton = ({ onClick, icon, label, tone = 'default' }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all ${
      tone === 'danger'
        ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
        : 'text-stone-500 hover:text-stone-200 hover:bg-white/5'
    }`}
  >
    {icon}{label}
  </button>
);
