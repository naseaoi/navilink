import React, { useEffect, useRef, useState } from 'react';
import { getCachedIconSrc, releaseCachedIconSrc } from '../../services/iconCache';

/**
 * 统一的卡片图标组件
 * 渲染优先级:IndexedDB 缓存 → 远程拉取并缓存 → Google favicon → 内置 SVG
 * 跨域图标若 fetch 失败,会跳过缓存直接走降级链
 */

const FALLBACK_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="#E7E5E4"/><rect x="16" y="18" width="32" height="28" rx="6" stroke="#78716C" stroke-width="3"/><circle cx="26" cy="28" r="3" fill="#78716C"/><path d="M20 42l9-9 6 6 5-5 8 8" stroke="#78716C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
)}`;

const buildFaviconFallback = (siteUrl?: string): string | null => {
  if (!siteUrl) return null;
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).hostname}&sz=128`;
  } catch {
    return null;
  }
};

interface CachedIconProps {
  /** 卡片配置的 icon 字段(可能是远程 URL,或为空) */
  icon?: string;
  /** 卡片对应的目标网站 URL,用于 favicon 兜底 */
  siteUrl?: string;
  alt?: string;
  className?: string;
}

export const CachedIcon: React.FC<CachedIconProps> = ({ icon, siteUrl, alt, className }) => {
  const normalizedIcon = icon?.trim() || '';
  const isInlineIcon = /^(data:|blob:)/i.test(normalizedIcon);
  const [src, setSrc] = useState<string>(() => (isInlineIcon ? normalizedIcon : FALLBACK_ICON));
  const [fallbackStage, setFallbackStage] = useState<'origin' | 'favicon' | 'svg'>('origin');
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsVisible(false);
    if (!normalizedIcon || isInlineIcon) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setIsVisible(true);
      observer.disconnect();
    }, { rootMargin: '200px' });
    if (imageRef.current) observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [isInlineIcon, normalizedIcon]);

  useEffect(() => {
    let cancelled = false;
    let acquired = false;
    if (!normalizedIcon) {
      setSrc(FALLBACK_ICON);
      setFallbackStage('svg');
      return;
    }
    if (isInlineIcon) {
      setSrc(normalizedIcon);
      setFallbackStage('origin');
      return;
    }
    setSrc(FALLBACK_ICON);
    setFallbackStage('origin');
    if (!isVisible) return;

    getCachedIconSrc(normalizedIcon)
      .then((cachedSrc) => {
        acquired = true;
        if (cancelled) {
          releaseCachedIconSrc(normalizedIcon);
          return;
        }
        setSrc(cachedSrc);
      })
      .catch(() => {
        if (!cancelled) setSrc(normalizedIcon);
      });

    return () => {
      cancelled = true;
      if (acquired) releaseCachedIconSrc(normalizedIcon);
    };
  }, [isInlineIcon, isVisible, normalizedIcon]);

  const handleError = () => {
    if (fallbackStage === 'origin') {
      const favicon = buildFaviconFallback(siteUrl);
      if (favicon) {
        setSrc(favicon);
        setFallbackStage('favicon');
        return;
      }
      setSrc(FALLBACK_ICON);
      setFallbackStage('svg');
      return;
    }
    if (fallbackStage === 'favicon') {
      setSrc(FALLBACK_ICON);
      setFallbackStage('svg');
    }
  };

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt || ''}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
};
