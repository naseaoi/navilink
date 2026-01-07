import { PublicData, PrivateData, EnvConfig } from '../types';

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
  private isMock: boolean;

  constructor() {
    // Check if we are in a production-like environment where the API is available.
    // In local development without 'vercel dev', we might still want mock or direct connection.
    // For this implementation, we assume if we can't hit the API, we fallback to Mock or handle error.
    // Note: client-side process.env.WEBDAV_URL is used here just to detect if envs were provided at build time,
    // but the actual credentials are now handled by the serverless function /api/webdav.
    
    // logic: If NO env vars are injected at build time (and not mock), we assume Vercel Serverless environment.
    // However, to keep it simple: If we are on the deployed site, we use the Proxy.
    this.isMock = false; 
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
          'Content-Type': 'application/json'
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
    try {
      const response = await fetch('/api/webdav?file=private.json', {
        method: 'GET',
      });

      if (response.status === 404) {
        await this.savePrivateData(DEFAULT_PRIVATE_DATA);
        return DEFAULT_PRIVATE_DATA;
      }
      
      if (!response.ok) {
         const stored = localStorage.getItem('navilink_private');
         if (stored) return JSON.parse(stored);
         return DEFAULT_PRIVATE_DATA;
      }

      return await response.json();
    } catch (e) {
      const stored = localStorage.getItem('navilink_private');
      if (stored) return JSON.parse(stored);
      return DEFAULT_PRIVATE_DATA;
    }
  }

  async savePrivateData(data: PrivateData): Promise<void> {
    try {
      const response = await fetch('/api/webdav?file=private.json', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save via API');
    } catch (e) {
       localStorage.setItem('navilink_private', JSON.stringify(data));
       throw e;
    }
  }
}

export const webdav = new WebDavService();