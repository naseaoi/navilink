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

interface SidebarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

interface NavButtonProps extends SidebarButtonProps {
  active: boolean;
  disabled?: boolean;
}

interface FooterButtonProps extends SidebarButtonProps {
  tone?: 'default' | 'danger';
}

const NavButton = ({ active, onClick, icon, label, disabled = false }: NavButtonProps) => (
  <button disabled={disabled} onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-control text-sm font-medium transition-all border ${active ? 'bg-subtle text-1 border-default shadow-soft' : 'text-2 border-transparent hover:text-1 hover:bg-subtle hover:border-subtle'} ${disabled ? 'opacity-40 cursor-not-allowed hover:text-2 hover:bg-transparent hover:border-transparent' : ''}`}>
    {icon}{label}
  </button>
);

const FooterButton = ({ onClick, icon, label, tone = 'default' }: FooterButtonProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-control text-sm font-medium transition-all border border-transparent ${
      tone === 'danger'
        ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
        : 'text-2 hover:text-1 hover:bg-subtle hover:border-subtle'
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
      <div className="p-7 border-b border-subtle flex items-center gap-4">
        <div className="w-10 h-10 rounded-pill flex items-center justify-center text-white dark:text-stone-900 shadow-soft shrink-0 bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300">
          <Shield size={20} />
        </div>
        <div>
          <span className="font-semibold text-1 block text-lg leading-tight tracking-tight-display">NaviLink</span>
          <span className="text-[10px] uppercase tracking-widest text-3 font-medium">管理后台 Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
        <NavButton active={activeTab === 'cards'} disabled={mustChangePassword} onClick={() => switchTab('cards')} icon={<Layout size={18} />} label="卡片管理" />
        <NavButton active={activeTab === 'categories'} disabled={mustChangePassword} onClick={() => switchTab('categories')} icon={<Layers size={18} />} label="分类管理" />
        <NavButton active={activeTab === 'settings'} onClick={() => switchTab('settings')} icon={<Settings size={18} />} label="网站设置" />
        <NavButton active={activeTab === 'storage'} disabled={mustChangePassword} onClick={() => switchTab('storage')} icon={<Database size={18} />} label="数据存储" />
      </nav>

      <div className="p-5 border-t border-subtle space-y-2">
        <FooterButton onClick={onGoHome} icon={<Home size={18} />} label="返回首页" />
        <FooterButton onClick={onLogout} icon={<LogOut size={18} />} label="退出登录" tone="danger" />
      </div>
    </>
  );
};
