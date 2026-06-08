import React from 'react';
import { Compass } from 'lucide-react';

export const AppLoading: React.FC<{ withLabel?: boolean }> = ({ withLabel = false }) => (
  <div className={`h-screen w-screen flex items-center justify-center bg-canvas ${withLabel ? 'flex-col gap-4' : ''}`}>
    <div className="w-12 h-12 rounded-modal flex items-center justify-center text-white dark:text-stone-900 shadow-soft animate-pulse bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300">
      <Compass size={20} strokeWidth={2.2} />
    </div>
    {withLabel && <span className="text-3 text-[11.5px] tracking-wide animate-pulse">加载中</span>}
  </div>
);
