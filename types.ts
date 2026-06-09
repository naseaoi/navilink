export interface SiteSettings {
  title: string;
  icon: string; // URL or emoji
  footerText?: string; // Custom footer text
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
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

export interface DataMeta {
  updatedAt?: number;
}

export interface PublicData {
  settings: SiteSettings;
  categories: Category[];
  cards: LinkCard[];
  _meta?: DataMeta;
}

export interface PrivateData {
  admin: {
    username: string;
    passwordHash: string; // scrypt$<salt>$<hash> or legacy plain text
  };
  _meta?: DataMeta;
}

export interface AppState {
  publicData: PublicData;
  hasFetchedPublicData: boolean;
  error: string | null;
}

// Env vars interface
export interface EnvConfig {
  webdavUrl: string;
  webdavUser: string;
  webdavPass: string;
  webdavPath: string;
}
