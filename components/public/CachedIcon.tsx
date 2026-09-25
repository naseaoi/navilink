import React, { useEffect, useRef, useState } from 'react';
import { getCachedIconSrc, releaseCachedIconSrc } from '../../services/iconCache';
import { observeVisibility } from '../../services/visibilityObserver';

// 配置图标和自动 favicon 共用代理缓存，代理失败后尝试源站直连。

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
  const favicon = buildFaviconFallback(siteUrl);
  const [useFavicon, setUseFavicon] = useState(false);
  const normalizedIcon = (useFavicon ? favicon : icon?.trim() || favicon) || '';
  const isInlineIcon = /^(data:|blob:)/i.test(normalizedIcon);
  const [src, setSrc] = useState<string>(() => (isInlineIcon ? normalizedIcon : FALLBACK_ICON));
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => { setUseFavicon(false); }, [icon, siteUrl]);

  useEffect(() => {
    setIsVisible(false);
    if (!normalizedIcon || isInlineIcon) return;
    const image = imageRef.current;
    if (!image) return;
    return observeVisibility(image, () => setIsVisible(true));
  }, [isInlineIcon, normalizedIcon]);

  useEffect(() => {
    let cancelled = false;
    let acquired = false;
    if (!normalizedIcon) {
      setSrc(FALLBACK_ICON);
      return;
    }
    if (isInlineIcon) {
      setSrc(normalizedIcon);
      return;
    }
    setSrc(FALLBACK_ICON);
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
    if (favicon && normalizedIcon !== favicon) setUseFavicon(true);
    else setSrc(FALLBACK_ICON);
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
