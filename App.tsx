import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { AdminDashboard } from './components/AdminDashboard';
import { webdav } from './services/webdavService';
import { AppState, PrivateData } from './types';
import { Button, Input, Card } from './components/UI';
import { ShieldCheck, Compass, CheckSquare, Square } from 'lucide-react';

const AUTH_KEY = 'navilink_auth';
const checkAuth = () => {
  const expiry = localStorage.getItem(`${AUTH_KEY}_expiry`);
  if (!expiry) return false;
  if (new Date().getTime() > parseInt(expiry)) {
    localStorage.removeItem(AUTH_KEY);
    return false;
  }
  return !!localStorage.getItem(AUTH_KEY);
};

const AdminLogin: React.FC<{ onLogin: () => void; privateData: PrivateData | null }> = ({ onLogin, privateData }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  
  const handleLogin = () => {
    if (!privateData) return;
    if (username === privateData.admin.username && password === privateData.admin.passwordHash) {
      localStorage.setItem(AUTH_KEY, 'true');
      const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days vs 24 hours
      localStorage.setItem(`${AUTH_KEY}_expiry`, (new Date().getTime() + duration).toString());
      onLogin();
    } else setError("凭据无效");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6 dark:bg-[#1c1917] font-sans">
      <Card className="w-full max-w-sm p-10 space-y-8 animate-in zoom-in-95 duration-500 border border-stone-200 shadow-xl shadow-stone-200/50 dark:border-stone-800 dark:shadow-none">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-stone-900 rounded-full mx-auto flex items-center justify-center text-white mb-6 shadow-xl shadow-stone-900/20 dark:bg-stone-100 dark:text-stone-900"><ShieldCheck size={28} /></div>
          <h2 className="text-2xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100">安全中心</h2>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Auth Verification</p>
        </div>
        {error && <div className="text-center text-red-600 text-sm font-medium bg-red-50 py-2 rounded-lg dark:bg-red-900/20 dark:text-red-400">{error}</div>}
        <div className="space-y-5">
          <Input label="用户名" value={username} onChange={e=>setUsername(e.target.value)} />
          <Input label="授权密码" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
          <div className="flex items-center gap-2 cursor-pointer text-stone-600 dark:text-stone-400 select-none" onClick={()=>setRemember(!remember)}>
             {remember ? <CheckSquare size={18} className="text-stone-900 dark:text-stone-100" /> : <Square size={18} />}
             <span className="text-sm">30天免登录</span>
          </div>
        </div>
        <Button className="w-full py-3 rounded-xl text-base shadow-lg shadow-stone-900/10" onClick={handleLogin}>验证身份</Button>
      </Card>
    </div>
  );
};

const MainApp = () => {
  const [state, setState] = useState<AppState>({ publicData: { settings: { title: 'NaviLink', icon: '' }, categories: [], cards: [] }, isLoading: true, error: null });
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  
  // Theme State
  const [theme, setTheme] = useState<'light'|'dark'|'system'>('system');

  // Load Theme
  useEffect(() => {
    const stored = localStorage.getItem('navilink_theme') as any;
    if (stored) setTheme(stored);
  }, []);

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    };
    apply();
    localStorage.setItem('navilink_theme', theme);
    
    if (theme === 'system') {
      const m = window.matchMedia('(prefers-color-scheme: dark)');
      m.addEventListener('change', apply);
      return () => m.removeEventListener('change', apply);
    }
  }, [theme]);

  const toggleTheme = () => {
    const cycle: Record<string, 'light'|'dark'|'system'> = { 'system': 'light', 'light': 'dark', 'dark': 'system' };
    setTheme(cycle[theme]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const pub = await webdav.fetchPublicData();
        setState(prev => ({ ...prev, publicData: pub, isLoading: false }));
        const priv = await webdav.fetchPrivateData();
        setPrivateData(priv);
      } catch (e) { setState(prev => ({ ...prev, isLoading: false, error: "无法同步远程数据" })); }
    };
    init();
  }, []);

  // Update document title when settings change
  useEffect(() => {
    if (state.publicData.settings.title) {
      document.title = state.publicData.settings.title;
    }
  }, [state.publicData.settings.title]);

  if (state.isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fafaf9] dark:bg-[#1c1917] gap-4">
      <div className="w-12 h-12 bg-stone-900 dark:bg-stone-100 rounded-full flex items-center justify-center text-white dark:text-stone-900 shadow-xl animate-bounce">
         <Compass size={24} />
      </div>
      <span className="text-stone-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading System...</span>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<PublicView data={state.publicData} theme={theme} onToggleTheme={toggleTheme} />} />
      <Route path="/tat" element={
        // Fix flash: If authenticated but privateData not yet loaded, show loading instead of login
        isAuthenticated ? (
          privateData ? (
            <AdminDashboard 
              publicData={state.publicData} 
              privateData={privateData}
              onUpdatePublic={d=>setState(s=>({...s, publicData:d}))}
              onUpdatePrivate={setPrivateData}
              onLogout={() => { localStorage.removeItem(AUTH_KEY); setIsAuthenticated(false); }} 
            />
          ) : (
            // Re-using the loading spinner style for admin transition
             <div className="h-screen w-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#1c1917]">
                <div className="w-12 h-12 bg-stone-900 dark:bg-stone-100 rounded-full flex items-center justify-center text-white dark:text-stone-900 shadow-xl animate-bounce">
                  <Compass size={24} />
                </div>
             </div>
          )
        ) : <AdminLogin onLogin={()=>setIsAuthenticated(true)} privateData={privateData} />
      } />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() { return <BrowserRouter><MainApp /></BrowserRouter>; }