import { PublicData, PrivateData, EnvConfig } from '../types';

// Helper to get env vars safely
const getEnv = (): EnvConfig => {
  // In a real Vercel environment, these are process.env.
  // For this demo code, we use placeholders if missing.
  return {
    webdavUrl: process.env.WEBDAV_URL || '',
    webdavUser: process.env.WEBDAV_USERNAME || '',
    webdavPass: process.env.WEBDAV_PASSWORD || '',
    webdavPath: process.env.WEBDAV_PATH || '/navilink',
  };
};

const DEFAULT_PUBLIC_DATA: PublicData = {
  settings: {
    title: "我的导航",
    icon: "" // Empty implies default SVG
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
    },
    {
      id: "card_3",
      categoryId: "cat_2",
      title: "Bilibili",
      description: "哔哩哔哩 (゜-゜)つロ 干杯~",
      url: "https://bilibili.com",
      icon: "https://www.bilibili.com/favicon.ico",
      order: 0
    }
  ]
};

const DEFAULT_PRIVATE_DATA: PrivateData = {
  admin: {
    username: "admin",
    passwordHash: "admin123" // In real world, bcrypt this
  }
};

class WebDavService {
  private config: EnvConfig;
  private isMock: boolean;

  constructor() {
    this.config = getEnv();
    this.isMock = !this.config.webdavUrl;
    if (this.isMock) {
      console.warn("WebDAV environment variables missing. Running in MOCK mode (Browser Storage).");
    }
  }

  private getAuthHeader() {
    return 'Basic ' + btoa(`${this.config.webdavUser}:${this.config.webdavPass}`);
  }

  async fetchPublicData(): Promise<PublicData> {
    if (this.isMock) {
      const stored = localStorage.getItem('navilink_public');
      if (stored) return JSON.parse(stored);
      return DEFAULT_PUBLIC_DATA;
    }

    try {
      const response = await fetch(`${this.config.webdavUrl}${this.config.webdavPath}/public.json`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      if (response.status === 404) {
        // Init file if not exists
        await this.savePublicData(DEFAULT_PUBLIC_DATA);
        return DEFAULT_PUBLIC_DATA;
      }
      if (!response.ok) throw new Error('Failed to fetch public data');
      return await response.json();
    } catch (e) {
      console.error("WebDAV Error:", e);
      // Fallback for demo stability if connection fails
      return DEFAULT_PUBLIC_DATA;
    }
  }

  async savePublicData(data: PublicData): Promise<void> {
    if (this.isMock) {
      localStorage.setItem('navilink_public', JSON.stringify(data));
      return;
    }

    await fetch(`${this.config.webdavUrl}${this.config.webdavPath}/public.json`, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  async fetchPrivateData(): Promise<PrivateData> {
     if (this.isMock) {
      const stored = localStorage.getItem('navilink_private');
      if (stored) return JSON.parse(stored);
      return DEFAULT_PRIVATE_DATA;
    }

    try {
      const response = await fetch(`${this.config.webdavUrl}${this.config.webdavPath}/private.json`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      if (response.status === 404) {
        await this.savePrivateData(DEFAULT_PRIVATE_DATA);
        return DEFAULT_PRIVATE_DATA;
      }
      if (!response.ok) throw new Error('Failed to fetch private data');
      return await response.json();
    } catch (e) {
      console.error(e);
      return DEFAULT_PRIVATE_DATA;
    }
  }

  async savePrivateData(data: PrivateData): Promise<void> {
    if (this.isMock) {
      localStorage.setItem('navilink_private', JSON.stringify(data));
      return;
    }

    await fetch(`${this.config.webdavUrl}${this.config.webdavPath}/private.json`, {
      method: 'PUT',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }
}

export const webdav = new WebDavService();