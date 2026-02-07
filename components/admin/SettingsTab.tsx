import React from 'react';
import { Layout, Shield } from 'lucide-react';
import { Card, Input, PasswordInput } from '../UI';
import { PublicData, PrivateData } from '../../types';

interface SettingsTabProps {
  dataP: PublicData;
  dataV: PrivateData;
  onP: (data: PublicData) => void;
  onV: (data: PrivateData) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ dataP, dataV, onP, onV }) => (
  <div className="grid gap-8 lg:grid-cols-2">
    <Card className="p-8 space-y-6">
      <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100"><Layout size={18}/> 基础信息</h3>
      <Input label="站点标题" value={dataP.settings.title} onChange={e=>onP({ ...dataP, settings: { ...dataP.settings, title: e.target.value } })} />
      <Input label="站点图标 (Emoji/URL)" value={dataP.settings.icon} onChange={e=>onP({ ...dataP, settings: { ...dataP.settings, icon: e.target.value } })} />
      <Input label="底部文字" value={dataP.settings.footerText || ''} placeholder="© 2025 NaviLink..." onChange={e=>onP({ ...dataP, settings: { ...dataP.settings, footerText: e.target.value } })} />
    </Card>
    <Card className="p-8 border-red-100 dark:border-red-900/20 space-y-6">
      <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-red-700 dark:text-red-400"><Shield size={18}/> 管理账号</h3>
      <Input label="管理员账号" value={dataV.admin.username} onChange={e=>onV({ ...dataV, admin: { ...dataV.admin, username: e.target.value } })} />
      <PasswordInput label="重置密码" placeholder="输入新密码..." onChange={e=>onV({ ...dataV, admin: { ...dataV.admin, passwordHash: e.target.value } })} />
    </Card>
  </div>
);
