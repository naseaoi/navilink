import { PrivateData, PublicData } from '../types';

const httpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const requireText = (value: string, label: string, max: number) => {
  const text = value.trim();
  if (!text) return `${label}不能为空`;
  if (text.length > max) return `${label}不能超过 ${max} 个字符`;
  return null;
};

const optionalText = (value: string | undefined, label: string, max: number) => {
  const text = (value || '').trim();
  if (text.length > max) return `${label}不能超过 ${max} 个字符`;
  return null;
};

export const validatePublicDataForSave = (data: PublicData) => {
  const titleError = requireText(data.settings.title, '站点标题', 80);
  if (titleError) return titleError;

  const footerError = optionalText(data.settings.footerText, '底部文字', 240);
  if (footerError) return footerError;

  const icon = data.settings.icon.trim();
  if (/^https?:\/\//i.test(icon) && !httpUrl(icon)) return '站点图标 URL 无效';

  for (const category of data.categories) {
    const nameError = requireText(category.name, '分类名称', 80);
    if (nameError) return nameError;
  }

  for (const card of data.cards) {
    const title = requireText(card.title, '卡片名称', 80);
    if (title) return title;
    const description = optionalText(card.description, '卡片描述', 240);
    if (description) return description;
    if (!httpUrl(card.url)) return `卡片「${card.title || card.id}」URL 无效`;
    if (card.icon?.trim() && !httpUrl(card.icon.trim())) return `卡片「${card.title || card.id}」图标 URL 无效`;
  }

  return null;
};

export const validatePrivateDataForSave = (data: PrivateData, newPassword: string, mustChangePassword: boolean) => {
  const usernameError = requireText(data.admin.username, '管理员账号', 64);
  if (usernameError) return usernameError;
  const password = newPassword.trim();
  if (mustChangePassword && !password) return '请设置新密码';
  if (password && password.length < 8) return '新密码至少 8 个字符';
  if (password.length > 128) return '新密码不能超过 128 个字符';
  return null;
};
