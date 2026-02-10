import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PublicData, PrivateData } from '../types';
import { webdav } from '../services/webdavService';
import { Button, ToastContainer, ToastMessage, ToastType, ConfirmModal } from './UI';
import { Menu, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsTab } from './admin/SettingsTab';
import { CardsTab } from './admin/CardsTab';
import { CategoriesTab } from './admin/CategoriesTab';
import { StorageTab } from './admin/StorageTab';
import { AdminSidebar } from './admin/AdminSidebar';
import { AdminTab, getAdminTabTitle } from './admin/adminLabels';

interface AdminDashboardProps {
  publicData: PublicData;
  privateData: PrivateData;
  mustChangePassword: boolean;
  onPasswordPolicyResolved: () => void;
  onLogout: () => void;
  onUpdatePublic: (d: PublicData) => void;
  onUpdatePrivate: (d: PrivateData) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ publicData, privateData, mustChangePassword, onPasswordPolicyResolved, onLogout, onUpdatePublic, onUpdatePrivate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('cards');
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
  useEffect(() => { setLocalPrivate(privateData); }, [privateData]);

  const hasShownPolicyToast = useRef(false);
  useEffect(() => {
    if (!mustChangePassword) {
      hasShownPolicyToast.current = false;
      return;
    }
    setActiveTab('settings');
    if (!hasShownPolicyToast.current) {
      showToast('检测到默认密码，请先在“网站设置”中修改密码并保存', 'error');
      hasShownPolicyToast.current = true;
    }
  }, [mustChangePassword, showToast]);

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
    if (mustChangePassword && localPrivate.admin.passwordHash === privateData.admin.passwordHash) {
      showToast('请先修改默认密码后再保存', 'error');
      setActiveTab('settings');
      return;
    }

    setIsSaving(true);
    try {
      await webdav.savePublicData(localPublic);
      await webdav.savePrivateData(localPrivate);
      onUpdatePublic(localPublic);
      onUpdatePrivate(localPrivate);
      if (mustChangePassword) onPasswordPolicyResolved();
      setHasChanges(false);
      await refreshStorageStatus();
      showToast('设置保存成功', 'success');
    } catch (error) {
      showToast('保存失败', 'error');
    } finally { setIsSaving(false); }
  };

  const markChanged = () => setHasChanges(true);

  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col md:flex-row bg-[#fafaf9] dark:bg-[#1c1917] overflow-hidden font-sans text-stone-800 dark:text-stone-200">
      <ToastContainer messages={toasts} onRemove={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(p=>({...p, isOpen: false}))} 
        onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} variant={confirmConfig.variant}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-[#292524] text-stone-400 flex-col flex-shrink-0 z-30 dark:bg-[#0c0a09] dark:border-r dark:border-stone-800">
        <AdminSidebar
          activeTab={activeTab}
          mustChangePassword={mustChangePassword}
          onTabChange={setActiveTab}
          onGoHome={() => navigate('/')}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 bg-[#292524] text-stone-400 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-300">
             <button className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
             <AdminSidebar
               activeTab={activeTab}
               mustChangePassword={mustChangePassword}
               onTabChange={setActiveTab}
               onGoHome={() => navigate('/')}
               onLogout={onLogout}
               onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
             />
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
             {getAdminTabTitle(activeTab)}
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

        {mustChangePassword && (
          <div className="mx-4 mt-4 md:mx-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            当前账号仍在使用默认密码，请在“网站设置”中修改密码并保存后再进行其他操作。
          </div>
        )}

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
