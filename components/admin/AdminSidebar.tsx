import React from 'react';
import { Database, Home, Layout, Layers, LogOut, Settings, Shield } from 'lucide-react';
import { AdminTab } from './adminLabels';

interface AdminSidebarProps {
  activeTab: AdminTab;
  mustChangePassword: boolean;
  onTabChange: (tab: AdminTab) => void;
  onGoHome: () => void;
  onLogout: () => void;
  onCloseMobileMenu?: () => void;
}

const NavButton = ({ active, onClick, icon, label, disabled = false }: any) => (
  <button disabled={disabled} onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-stone-100 text-stone-900 shadow-lg shadow-black/5' : 'text-stone-500 hover:text-stone-200 hover:bg-white/5'} ${disabled ? 'opacity-40 cursor-not-allowed hover:text-stone-500 hover:bg-transparent' : ''}`}>
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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  mustChangePassword,
  onTabChange,
  onGoHome,
  onLogout,
  onCloseMobileMenu
}) => {
  const switchTab = (tab: AdminTab) => {
    onTabChange(tab);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  return (
    <>
      <div className="p-8 border-b border-white/5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-900 shadow-lg shadow-black/20 shrink-0">
          <Shield size={20} />
        </div>
        <div>
          <span className="font-serif font-bold text-stone-100 block text-lg leading-tight tracking-tight">NaviLink</span>
          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">管理后台 Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        <NavButton active={activeTab === 'cards'} disabled={mustChangePassword} onClick={() => switchTab('cards')} icon={<Layout size={18} />} label="卡片管理" />
        <NavButton active={activeTab === 'categories'} disabled={mustChangePassword} onClick={() => switchTab('categories')} icon={<Layers size={18} />} label="分类管理" />
        <NavButton active={activeTab === 'settings'} onClick={() => switchTab('settings')} icon={<Settings size={18} />} label="网站设置" />
        <NavButton active={activeTab === 'storage'} disabled={mustChangePassword} onClick={() => switchTab('storage')} icon={<Database size={18} />} label="数据存储" />
      </nav>

      <div className="p-6 border-t border-white/5 space-y-2">
        <FooterButton onClick={onGoHome} icon={<Home size={18} />} label="返回首页" />
        <FooterButton onClick={onLogout} icon={<LogOut size={18} />} label="退出登录" tone="danger" />
      </div>
    </>
  );
};
