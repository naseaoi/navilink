export interface SiteSettings {
  title: string;
  icon: string; // URL or emoji
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface LinkCard {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  url: string;
  icon: string; // URL to image
  order: number;
}

export interface PublicData {
  settings: SiteSettings;
  categories: Category[];
  cards: LinkCard[];
}

export interface PrivateData {
  admin: {
    username: string;
    passwordHash: string; // Storing plain text for simplicity in this demo, but should be hashed in real app
  };
}

export interface AppState {
  publicData: PublicData;
  isLoading: boolean;
  error: string | null;
}

// Env vars interface
export interface EnvConfig {
  webdavUrl: string;
  webdavUser: string;
  webdavPass: string;
  webdavPath: string;
}