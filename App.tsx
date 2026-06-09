import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { HomePage } from './components/public/HomePage';
import { CategoryPage } from './components/public/CategoryPage';
import { AdminLogin } from './components/admin/AdminLogin';
import { usePageMeta } from './hooks/usePageMeta';
import { useTheme } from './hooks/useTheme';
import {
  clearAuthSession,
  clearPasswordPolicyFlag,
  hasPasswordPolicyFlag,
  hasValidAuthSession
} from './services/authSession';
import { webdav } from './services/webdavService';
import { AppState, PrivateData } from './types';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((mod) => ({ default: mod.AdminDashboard })));

const MainApp = () => {
  const [state, setState] = useState<AppState>({
    publicData: { settings: { title: 'NaviLink', icon: '' }, categories: [], cards: [] },
    hasFetchedPublicData: false,
    error: null
  });
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(hasValidAuthSession());
  const [mustChangePassword, setMustChangePassword] = useState(hasPasswordPolicyFlag());
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
    const loadPrivate = async () => {
      if (!isAuthenticated) return;
      try {
        const priv = await webdav.fetchPrivateData();
        setPrivateData(priv);
      } catch (e) {
        clearAuthSession();
        setPrivateData(null);
        setIsAuthenticated(false);
        setMustChangePassword(false);
      }
    };
    loadPrivate();
  }, [isAuthenticated]);

  const handleLogout = () => {
    clearAuthSession();
    setPrivateData(null);
    setIsAuthenticated(false);
    setMustChangePassword(false);
  };

  const handlePasswordPolicyResolved = () => {
    clearPasswordPolicyFlag();
    setMustChangePassword(false);
  };

  return (
    <Routes>
      <Route element={<PublicView data={state.publicData} hasFetchedData={state.hasFetchedPublicData} dataStatus={state.error} theme={theme} onToggleTheme={toggleTheme} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:categoryId" element={<CategoryPage />} />
      </Route>
      <Route path="/tat" element={
        isAuthenticated ? (
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
        ) : (
          <AdminLogin onLogin={(nextMustChangePassword) => {
            setMustChangePassword(nextMustChangePassword);
            setIsAuthenticated(true);
          }} />
        )
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
