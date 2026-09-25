import { LinkCard, PrivateData, PublicData } from '../types';
import limits from '../api/_shared/dataLimits.json' with { type: 'json' };
export { default as dataLimits } from '../api/_shared/dataLimits.json' with { type: 'json' };

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

const validCategoryIcons = new Set(limits.CATEGORY_ICON_KEYS);
const { MAX_ABS_ORDER } = limits;

const validateUniqueIds = (ids: string[], label: string) => {
  if (new Set(ids).size !== ids.length) return `${label} ID 不能重复`;
  return null;
};

export const validateCardFields = (card: Partial<LinkCard>, categoryIds: string[]) => ({
  title: requireText(card.title || '', '显示名称', limits.MAX_TITLE_LENGTH),
  description: optionalText(card.description, '描述', limits.MAX_DESCRIPTION_LENGTH),
  url: requireText(card.url || '', '目标 URL', limits.MAX_URL_LENGTH) || (!httpUrl(card.url || '') ? '请输入有效的 HTTP 或 HTTPS URL' : null),
  icon: optionalText(card.icon, '图标', limits.MAX_URL_LENGTH) || (card.icon?.trim() && !httpUrl(card.icon.trim()) ? '图标必须是有效的 HTTP 或 HTTPS URL' : null),
  categoryId: !categoryIds.includes(card.categoryId || '') ? '请选择所属分类' : null
});

export const validatePublicDataForSave = (data: PublicData) => {
  if (data.categories.length > limits.MAX_CATEGORIES) return `分类不能超过 ${limits.MAX_CATEGORIES} 个`;
  if (data.cards.length > limits.MAX_CARDS) return `卡片不能超过 ${limits.MAX_CARDS} 张`;
  if (data._meta && (!Number.isSafeInteger(data._meta.updatedAt) || (data._meta.updatedAt ?? 0) <= 0)) return '数据版本无效';
  const titleError = requireText(data.settings.title, '站点标题', limits.MAX_TITLE_LENGTH);
  if (titleError) return titleError;

  const footerError = optionalText(data.settings.footerText, '底部文字', limits.MAX_FOOTER_LENGTH);
  if (footerError) return footerError;

  const icon = data.settings.icon.trim();
  if (icon.length > limits.MAX_URL_LENGTH) return `站点图标不能超过 ${limits.MAX_URL_LENGTH} 个字符`;
  if (/^https?:\/\//i.test(icon) && !httpUrl(icon)) return '站点图标 URL 无效';

  const categoryIdError = validateUniqueIds(data.categories.map((category) => category.id.trim()), '分类');
  if (categoryIdError) return categoryIdError;
  const cardIdError = validateUniqueIds(data.cards.map((card) => card.id.trim()), '卡片');
  if (cardIdError) return cardIdError;
  const categoryIds = data.categories.map((category) => category.id.trim());

  for (const category of data.categories) {
    const idError = requireText(category.id, '分类 ID', limits.MAX_ID_LENGTH);
    if (idError) return idError;
    const nameError = requireText(category.name, '分类名称', limits.MAX_TITLE_LENGTH);
    if (nameError) return nameError;
    const icon = (category.icon || '').trim();
    if (icon && !validCategoryIcons.has(icon)) return `分类「${category.name || category.id}」图标无效`;
    if (!Number.isSafeInteger(category.order) || Math.abs(category.order) > MAX_ABS_ORDER) return `分类「${category.name || category.id}」排序值无效`;
  }

  for (const card of data.cards) {
    const idError = requireText(card.id, '卡片 ID', limits.MAX_ID_LENGTH) || requireText(card.categoryId, '所属分类 ID', limits.MAX_ID_LENGTH);
    if (idError) return idError;
    const fieldError = Object.values(validateCardFields({ ...card, categoryId: card.categoryId.trim() }, categoryIds)).find(Boolean);
    if (fieldError) return `卡片「${card.title || card.id}」：${fieldError}`;
    if (!Number.isSafeInteger(card.order) || Math.abs(card.order) > MAX_ABS_ORDER) return `卡片「${card.title || card.id}」排序值无效`;
  }

  return null;
};

export const validatePrivateDataForSave = (data: PrivateData, newPassword: string, mustChangePassword: boolean) => {
  const usernameError = requireText(data.admin.username, '管理员账号', limits.MAX_USERNAME_LENGTH);
  if (usernameError) return usernameError;
  const password = newPassword.trim();
  if (mustChangePassword && !password) return '请设置新密码';
  if (mustChangePassword && password === 'admin123') return '新密码不能继续使用默认密码';
  if (password && password.length < limits.MIN_PASSWORD_LENGTH) return `新密码至少 ${limits.MIN_PASSWORD_LENGTH} 个字符`;
  if (password.length > limits.MAX_PASSWORD_LENGTH) return `新密码不能超过 ${limits.MAX_PASSWORD_LENGTH} 个字符`;
  return null;
};
