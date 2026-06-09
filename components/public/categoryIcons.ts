import {
  BookOpen,
  BriefcaseBusiness,
  Code2,
  Compass,
  GraduationCap,
  Globe,
  Image,
  Layers,
  Lightbulb,
  Music,
  Palette,
  Rocket,
  ShoppingBag,
  Star,
  Wrench,
  type LucideIcon
} from 'lucide-react';
import { Category } from '../../types';

export interface CategoryIconOption {
  value: string;
  label: string;
  Icon: LucideIcon;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { value: 'book-open', label: '文档', Icon: BookOpen },
  { value: 'code-2', label: '代码', Icon: Code2 },
  { value: 'star', label: '精选', Icon: Star },
  { value: 'compass', label: '导航', Icon: Compass },
  { value: 'layers', label: '资源', Icon: Layers },
  { value: 'globe', label: '网络', Icon: Globe },
  { value: 'wrench', label: '工具', Icon: Wrench },
  { value: 'briefcase-business', label: '业务', Icon: BriefcaseBusiness },
  { value: 'graduation-cap', label: '学习', Icon: GraduationCap },
  { value: 'image', label: '图片', Icon: Image },
  { value: 'lightbulb', label: '灵感', Icon: Lightbulb },
  { value: 'music', label: '音乐', Icon: Music },
  { value: 'palette', label: '设计', Icon: Palette },
  { value: 'rocket', label: '启动', Icon: Rocket },
  { value: 'shopping-bag', label: '购物', Icon: ShoppingBag }
];

export const getCategoryIconValue = (index: number): string =>
  CATEGORY_ICON_OPTIONS[index % CATEGORY_ICON_OPTIONS.length].value;

export const getCategoryIcon = (category: Category, index: number): LucideIcon => {
  const value = category.icon || getCategoryIconValue(index);
  return CATEGORY_ICON_OPTIONS.find((option) => option.value === value)?.Icon ?? CATEGORY_ICON_OPTIONS[0].Icon;
};

export const sortCategories = (categories: Category[]): Category[] => [...categories].sort((a, b) => a.order - b.order);

export const categoryPath = (categoryId: string): string => `/c/${categoryId}`;
