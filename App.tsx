import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { HomePage } from './components/public/HomePage';
import { CategoryPage } from './components/public/CategoryPage';
import { AdminLogin } from './components/admin/AdminLogin';
import { usePageMeta } from './hooks/usePageMeta';
import { useTheme } from './hooks/useTheme';
import {
  logoutAuthSession,
  verifyAuthSession
} from './services/authSession';
import { webdav } from './services/webdavService';
import { AppState, PrivateData } from './types';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((mod) => ({ default: mod.AdminDashboard })));

const EMPTY_PUBLIC_DATA = { settings: { title: 'NaviLink', icon: '' }, categories: [], cards: [] };

const createInitialState = (): AppState => {
  const cached = webdav.getCachedPublicData();
  return cached
    ? { publicData: cached, hasFetchedPublicData: true, error: null }
    : { publicData: EMPTY_PUBLIC_DATA, hasFetchedPublicData: false, error: null };
};

const MainApp = () => {
  const location = useLocation();
  const [state, setState] = useState<AppState>(createInitialState);
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'anonymous'>('checking');
  const [verifiedAdminEntryKey, setVerifiedAdminEntryKey] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const { theme, toggleTheme } = useTheme();

  usePageMeta(state.publicData.settings.title, state.publicData.settings.icon);

  useEffect(() => {
    const init = async () => {
      try {
        const pub = await webdav.fetchPublicData();
        const source = webdav.getPublicDataSource();
        const error = source === 'api' ? null : source === 'localStorage' ? '正在使用本地缓存' : '正在使用默认数据';
        setState(prev => ({ ...prev, publicData: pub, hasFetchedPublicData: true, error }));
      } catch (e) {
        setState(prev => ({ ...prev, hasFetchedPublicData: true, error: '无法同步远程数据' }));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (location.pathname !== '/tat') return;
    let active = true;
    setAuthState('checking');
    setVerifiedAdminEntryKey(null);
    const verifySession = async () => {
      try {
        const session = await verifyAuthSession();
        if (!active) return;
        setMustChangePassword(session.mustChangePassword);
        setAuthState(session.authenticated ? 'authenticated' : 'anonymous');
      } catch {
        if (!active) return;
        setAuthState('anonymous');
      } finally {
        if (active) setVerifiedAdminEntryKey(location.key);
      }
    };
    verifySession();
    return () => {
      active = false;
    };
  }, [location.key, location.pathname]);

  useEffect(() => {
    const loadPrivate = async () => {
      if (authState !== 'authenticated') return;
      try {
        const priv = await webdav.fetchPrivateData();
        setPrivateData(priv);
      } catch (e) {
        setPrivateData(null);
        setAuthState('anonymous');
        setMustChangePassword(false);
      }
    };
    loadPrivate();
  }, [authState]);

  const handleLogout = async () => {
    await logoutAuthSession();
    setPrivateData(null);
    setAuthState('anonymous');
    setMustChangePassword(false);
  };

  const handlePasswordPolicyResolved = () => {
    setMustChangePassword(false);
  };

  return (
    <Routes>
      <Route element={<PublicView data={state.publicData} hasFetchedData={state.hasFetchedPublicData} dataStatus={state.error} theme={theme} onToggleTheme={toggleTheme} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:categoryId" element={<CategoryPage />} />
      </Route>
      <Route path="/tat" element={
        verifiedAdminEntryKey !== location.key ? null : authState === 'authenticated' ? (
          privateData ? (
            <Suspense fallback={null}>
              <AdminDashboard
                publicData={state.publicData}
                privateData={privateData}
                mustChangePassword={mustChangePassword}
                onPasswordPolicyResolved={handlePasswordPolicyResolved}
                onUpdatePublic={d => setState(s => ({ ...s, publicData: d }))}
                onUpdatePrivate={setPrivateData}
                onLogout={handleLogout}
              />
            </Suspense>
          ) : (
            null
          )
        ) : authState === 'anonymous' ? (
          <AdminLogin onLogin={(nextMustChangePassword) => {
            setMustChangePassword(nextMustChangePassword);
            setAuthState('authenticated');
          }} />
        ) : null
      } />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
