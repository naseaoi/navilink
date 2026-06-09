export type AdminTab = 'settings' | 'cards' | 'categories' | 'storage';

export const getAdminTabTitle = (tab: AdminTab) => {
  if (tab === 'cards') return '卡片管理';
  if (tab === 'categories') return '分类管理';
  if (tab === 'storage') return '数据存储';
  return '网站设置';
};
