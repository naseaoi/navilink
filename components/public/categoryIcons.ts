import { BookOpen, Code2, Compass, Globe, Layers, Star, Wrench, type LucideIcon } from 'lucide-react';
import { Category } from '../../types';

export const CATEGORY_ICONS: LucideIcon[] = [BookOpen, Code2, Star, Compass, Layers, Globe, Wrench];

export const getCategoryIcon = (index: number): LucideIcon => CATEGORY_ICONS[index % CATEGORY_ICONS.length];

export const sortCategories = (categories: Category[]): Category[] => [...categories].sort((a, b) => a.order - b.order);

export const categoryPath = (categoryId: string): string => `/c/${categoryId}`;
