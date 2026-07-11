import { PublicData, PrivateData } from '../types';
import { parsePublicData, readPublicDataCache } from './publicDataCache';

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

  getPublicDataSource(): 'api' | 'localStorage' | 'default' {
    return this.publicDataSource;
  }

  async getStorageMode(): Promise<{ mode: 'local' | 'webdav'; available: { local: boolean; webdav: boolean } }> {
    const response = await fetch('/api/storage/mode', {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Failed to load storage mode');
    return response.json();
  }

  async setStorageMode(mode: 'local' | 'webdav'): Promise<{ mode: 'local' | 'webdav'; available: { local: boolean; webdav: boolean } }> {
    const response = await fetch('/api/storage/mode', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode })
    });
    if (!response.ok) throw new Error('Failed to update storage mode');
    return response.json();
  }

  async syncStorage(from: 'local' | 'webdav', to: 'local' | 'webdav'): Promise<void> {
    const response = await fetch('/api/storage/sync', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to })
    });
    if (!response.ok) throw new Error('Failed to sync storage');
  }

  async getStorageStatus(): Promise<{ local: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; webdav: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; available: { local: boolean; webdav: boolean } }> {
    const response = await fetch('/api/storage/status', {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Failed to load storage status');
    return response.json();
  }

  async fetchPublicData(): Promise<PublicData> {
    try {
      const response = await fetch('/api/webdav?file=public.json', {
        method: 'GET',
        credentials: 'same-origin'
      });

      if (!response.ok) throw new Error(`Public data request failed: ${response.status}`);
      const data = parsePublicData(await response.json());
      localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(data));
      this.publicDataSource = 'api';
      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        const cached = readPublicDataCache(PUBLIC_CACHE_KEY);
        if (cached) {
          this.publicDataSource = 'localStorage';
          return cached;
        }
        this.publicDataSource = 'default';
        return DEFAULT_PUBLIC_DATA;
      }
      throw error;
    }
  }

  async savePublicData(data: PublicData): Promise<void> {
    const response = await fetch('/api/webdav?file=public.json', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to save via API');
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(data));
  }

  async fetchPrivateData(): Promise<PrivateData> {
    const response = await fetch('/api/webdav?file=private.json', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (!response.ok) throw new Error('Failed to load private data');

    return await response.json();
  }

  async savePrivateData(data: PrivateData): Promise<void> {
    const response = await fetch('/api/webdav?file=private.json', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to save private data');
  }

  async changePassword(username: string, password: string): Promise<PrivateData> {
    const response = await fetch('/api/auth/password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Failed to change password');
    const result: { privateData: PrivateData } = await response.json();
    return result.privateData;
  }

  async saveAllData(publicData: PublicData, privateData: PrivateData): Promise<{ publicData: PublicData; privateData: PrivateData }> {
    const response = await fetch('/api/storage/save', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicData,
        privateData,
        expected: {
          publicUpdatedAt: publicData._meta?.updatedAt ?? null,
          privateUpdatedAt: privateData._meta?.updatedAt ?? null
        }
      })
    });
    if (response.status === 409) throw new Error('DATA_CONFLICT');
    if (!response.ok) throw new Error('Failed to save data');
    const result: { publicData: PublicData; privateData: PrivateData } = await response.json();
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(result.publicData));
    return result;
  }
}

export const webdav = new WebDavService();
