import { PublicData, PrivateData } from '../types';
import { parsePublicData, readPublicDataCache, writePublicDataCache } from './publicDataCache';
import { requestJson } from './apiClient';

const PUBLIC_CACHE_KEY = 'navilink_public';

const DEFAULT_PUBLIC_DATA: PublicData = {
  settings: {
    title: "我的导航",
    icon: "",
    footerText: "© 2025 NaviLink. Minimalism."
  },
  categories: [
    { id: "cat_1", name: "常用工具", order: 0 },
    { id: "cat_2", name: "娱乐摸鱼", order: 1 }
  ],
  cards: [
    {
      id: "card_1",
      categoryId: "cat_1",
      title: "Google",
      description: "全球最大的搜索引擎",
      url: "https://google.com",
      icon: "https://www.google.com/favicon.ico",
      order: 0
    },
    {
      id: "card_2",
      categoryId: "cat_1",
      title: "GitHub",
      description: "代码托管与协作平台",
      url: "https://github.com",
      icon: "https://github.com/favicon.ico",
      order: 1
    }
  ]
};

class WebDavService {
  private publicDataSource: 'api' | 'localStorage' | 'default' = 'api';
  private cachedPublicData: PublicData | null | undefined;

  getPublicDataSource(): 'api' | 'localStorage' | 'default' {
    return this.publicDataSource;
  }

  getCachedPublicData(): PublicData | null {
    if (this.cachedPublicData === undefined) {
      this.cachedPublicData = readPublicDataCache(PUBLIC_CACHE_KEY);
    }
    return this.cachedPublicData;
  }

  private cachePublicData(data: PublicData): void {
    this.cachedPublicData = data;
    writePublicDataCache(PUBLIC_CACHE_KEY, data);
  }

  async getStorageMode(): Promise<{ mode: 'local' | 'webdav'; available: { local: boolean; webdav: boolean } }> {
    return requestJson('/api/storage/mode');
  }

  async setStorageMode(mode: 'local' | 'webdav'): Promise<{ mode: 'local' | 'webdav'; available: { local: boolean; webdav: boolean } }> {
    return requestJson('/api/storage/mode', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
  }

  async syncStorage(from: 'local' | 'webdav', to: 'local' | 'webdav'): Promise<void> {
    await requestJson('/api/storage/sync', { method: 'POST', timeoutMs: 120_000, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) });
  }

  async getStorageStatus(): Promise<{ local: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; webdav: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; available: { local: boolean; webdav: boolean } }> {
    return requestJson('/api/storage/status');
  }

  async fetchPublicData({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<PublicData> {
    const cached = this.getCachedPublicData();
    try {
      const endpoint = forceRefresh ? '/api/webdav?file=public.json&fresh=1' : '/api/webdav?file=public.json';
      const data = parsePublicData(await requestJson(endpoint, { authenticated: false, cache: forceRefresh ? 'no-store' : 'default' }));
      if (!forceRefresh && cached && (cached._meta?.updatedAt ?? 0) > (data._meta?.updatedAt ?? 0)) return this.fetchPublicData({ forceRefresh: true });
      this.cachePublicData(data);
      this.publicDataSource = 'api';
      return data;
    } catch {
      this.publicDataSource = cached ? 'localStorage' : 'default';
      return cached || DEFAULT_PUBLIC_DATA;
    }
  }

  async savePublicData(data: PublicData): Promise<void> {
    await requestJson('/api/webdav?file=public.json', { method: 'PUT', timeoutMs: 120_000, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    this.cachePublicData(data);
  }

  async fetchPrivateData(): Promise<PrivateData> {
    return requestJson('/api/webdav?file=private.json');
  }

  async savePrivateData(data: PrivateData): Promise<void> {
    await requestJson('/api/webdav?file=private.json', { method: 'PUT', timeoutMs: 120_000, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  }

  async changePassword(username: string, password: string): Promise<PrivateData> {
    const result = await requestJson<{ privateData: PrivateData }>('/api/auth/password', { method: 'POST', timeoutMs: 120_000, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    return result.privateData;
  }

  async saveAllData(publicData: PublicData, privateData: PrivateData): Promise<{ publicData: PublicData; privateData: PrivateData }> {
    const result = await requestJson<{ publicData: PublicData; privateData: PrivateData }>('/api/storage/save', {
      method: 'POST', timeoutMs: 120_000, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicData, privateData, expected: { publicUpdatedAt: publicData._meta?.updatedAt ?? null, privateUpdatedAt: privateData._meta?.updatedAt ?? null } })
    });
    this.cachePublicData(result.publicData);
    return result;
  }
}

export const webdav = new WebDavService();
