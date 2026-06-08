import { PublicData, PrivateData } from '../types';

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

const DEFAULT_PRIVATE_DATA: PrivateData = {
  admin: {
    username: "admin",
    passwordHash: "admin123" 
  }
};

class WebDavService {
  private getAuthToken(): string | null {
    return localStorage.getItem('navilink_token');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return { Authorization: `Bearer ${token}` };
  }

  async getStorageMode(): Promise<{ mode: 'local' | 'webdav'; available: { local: boolean; webdav: boolean } }> {
    const response = await fetch('/api/storage/mode', {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to load storage mode');
    return response.json();
  }

  async setStorageMode(mode: 'local' | 'webdav'): Promise<{ mode: 'local' | 'webdav'; available: { local: boolean; webdav: boolean } }> {
    const response = await fetch('/api/storage/mode', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ mode })
    });
    if (!response.ok) throw new Error('Failed to update storage mode');
    return response.json();
  }

  async syncStorage(from: 'local' | 'webdav', to: 'local' | 'webdav'): Promise<void> {
    const response = await fetch('/api/storage/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ from, to })
    });
    if (!response.ok) throw new Error('Failed to sync storage');
  }

  async getStorageStatus(): Promise<{ local: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; webdav: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null }; available: { local: boolean; webdav: boolean } }> {
    const response = await fetch('/api/storage/status', {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to load storage status');
    return response.json();
  }

  async fetchPublicData(): Promise<PublicData> {
    try {
      // Use the Vercel API Proxy
      const response = await fetch('/api/webdav?file=public.json', {
        method: 'GET',
      });

      if (response.status === 404) {
        // Init file if not exists
        await this.savePublicData(DEFAULT_PUBLIC_DATA);
        return DEFAULT_PUBLIC_DATA;
      }
      
      if (!response.ok) {
        // If API fails (e.g. local dev without API), fallback to LocalStorage Mock
        console.warn("API unavailable, falling back to local storage");
        const stored = localStorage.getItem('navilink_public');
        if (stored) return JSON.parse(stored);
        return DEFAULT_PUBLIC_DATA;
      }
      
      return await response.json();
    } catch (e) {
      console.error("Fetch Error:", e);
      const stored = localStorage.getItem('navilink_public');
      if (stored) return JSON.parse(stored);
      return DEFAULT_PUBLIC_DATA;
    }
  }

  async savePublicData(data: PublicData): Promise<void> {
    try {
      const response = await fetch('/api/webdav?file=public.json', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to save via API');
    } catch (e) {
      console.warn("API save failed, saving to local storage");
      localStorage.setItem('navilink_public', JSON.stringify(data));
      // Rethrow if you want the UI to know it failed on server
      throw e;
    }
  }

  async fetchPrivateData(): Promise<PrivateData> {
    const response = await fetch('/api/webdav?file=private.json', {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 404) {
      await this.savePrivateData(DEFAULT_PRIVATE_DATA);
      return DEFAULT_PRIVATE_DATA;
    }
    
    if (!response.ok) throw new Error('Failed to load private data');

    return await response.json();
  }

  async savePrivateData(data: PrivateData): Promise<void> {
    const response = await fetch('/api/webdav?file=private.json', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to save private data');
  }
}

export const webdav = new WebDavService();
