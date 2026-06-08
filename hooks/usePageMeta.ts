import { useEffect } from 'react';

export const usePageMeta = (title: string, icon: string) => {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    if (!icon) return;
    if (icon.startsWith('http')) {
      link.href = icon;
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 32, 32);
    link.href = canvas.toDataURL('image/png');
  }, [icon]);
};
