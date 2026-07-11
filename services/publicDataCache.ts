import { PublicData } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isString = (value: unknown): value is string => typeof value === 'string';
const isOrder = (value: unknown): value is number => Number.isSafeInteger(value) && Math.abs(value as number) <= 1_000_000;
const isHttpUrl = (value: unknown, optional = false) => {
  if (optional && value === '') return true;
  if (!isString(value)) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const parsePublicData = (value: unknown): PublicData => {
  if (!isRecord(value) || !isRecord(value.settings) || !Array.isArray(value.categories) || !Array.isArray(value.cards)) {
    throw new Error('Invalid public data');
  }
  const settings = value.settings;
  if (!isString(settings.title) || !isString(settings.icon)
    || (settings.footerText !== undefined && !isString(settings.footerText))) {
    throw new Error('Invalid public settings');
  }
  if (value._meta !== undefined) {
    if (!isRecord(value._meta) || !Number.isSafeInteger(value._meta.updatedAt) || (value._meta.updatedAt as number) <= 0) {
      throw new Error('Invalid public metadata');
    }
  }

  const categories = value.categories;
  const categoryIds = new Set<string>();
  categories.forEach((category) => {
    if (!isRecord(category) || !isString(category.id) || !isString(category.name) || !isOrder(category.order)
      || (category.icon !== undefined && !isString(category.icon))) {
      throw new Error('Invalid category data');
    }
    if (categoryIds.has(category.id)) throw new Error('Duplicate category id');
    categoryIds.add(category.id);
  });

  const cardIds = new Set<string>();
  value.cards.forEach((card) => {
    if (!isRecord(card) || !isString(card.id) || !isString(card.categoryId) || !isString(card.title)
      || !isString(card.description) || !isHttpUrl(card.url) || !isHttpUrl(card.icon, true) || !isOrder(card.order)) {
      throw new Error('Invalid card data');
    }
    if (cardIds.has(card.id) || !categoryIds.has(card.categoryId)) throw new Error('Invalid card relation');
    cardIds.add(card.id);
  });

  return value as unknown as PublicData;
};

export const readPublicDataCache = (key: string): PublicData | null => {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return parsePublicData(JSON.parse(stored));
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};
