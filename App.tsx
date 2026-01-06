import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { AdminDashboard } from './components/AdminDashboard';
import { webdav } from './services/webdavService';
import { AppState, PublicData, PrivateData } from './types';
import { Button, Input, Card } from './components/UI';
import { Loader2, Lock } from 'lucide-react';

// --- Auth Utilities ---
const AUTH_KEY = 'navilink_auth';
const checkAuth = () => {
  const expiry = localStorage.getItem(`${AUTH_KEY}_expiry`);
  if (!expiry) return false;
  if (new Date().getTime() > parseInt(expiry)) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(`${AUTH_KEY}_expiry`);
    return false;
  }
  return !!localStorage.getItem(AUTH_KEY);
};

// --- Login Component ---
const AdminLogin: React.FC<{ onLogin: () => void; privateData: PrivateData | null }> = ({ onLogin, privateData }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    // Simple client-side validation against the fetched private data
    if (!privateData) {
      setError("管理员数据尚未加载。");
      return;
    }
    
    if (username === privateData.admin.username && password === privateData.admin.passwordHash) {
      localStorage.setItem(AUTH_KEY, 'true');
      if (remember) {
        // 30 days
        const date = new Date();
        date.setDate(date.getDate() + 30);
        localStorage.setItem(`${AUTH_KEY}_expiry`, date.getTime().toString());
      } else {
        // Session only (1 day fallback)
        const date = new Date();
        date.setDate(date.getDate() + 1);
        localStorage.setItem(`${AUTH_KEY}_expiry`, date.getTime().toString());
      }
      onLogin();
    } else {
      setError("账号或密码错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 rounded-xl mx-auto flex items-center justify-center text-white mb-4 dark:bg-indigo-600">
            <Lock size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">管理员登录</h2>
          <p className="text-slate-500 text-sm dark:text-slate-400">请输入您的账号密码以继续</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg dark:bg-red-900/20 dark:text-red-300">{error}</div>}

        <div className="space-y-4">
          <Input 
            label="账号" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <Input 
            label="密码" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="remember" 
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:checked:bg-indigo-500"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">30天免登录</label>
          </div>
        </div>

        <Button className="w-full" onClick={handleLogin}>登录</Button>
      </Card>
    </div>
  );
};

// --- Main App Logic ---
const MainApp = () => {
  const [state, setState] = useState<AppState>({
    publicData: { settings: { title: '', icon: '' }, categories: [], cards: [] },
    isLoading: true,
    error: null
  });
  
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());

  useEffect(() => {
    const init = async () => {
      try {
        const pub = await webdav.fetchPublicData();
        setState(prev => ({ ...prev, publicData: pub, isLoading: false }));
        
        // We also fetch private data to validate login attempts
        const priv = await webdav.fetchPrivateData();
        setPrivateData(priv);
      } catch (e) {
        setState(prev => ({ ...prev, isLoading: false, error: "无法加载配置" }));
      }
    };
    init();
  }, []);

  if (state.isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (state.error) {
    return <div className="p-10 text-center text-red-500">{state.error}</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<PublicView data={state.publicData} />} />
      <Route path="/tat" element={
        isAuthenticated ? (
          <Navigate to="/admin" replace />
        ) : (
          <AdminLogin 
            onLogin={() => setIsAuthenticated(true)} 
            privateData={privateData}
          />
        )
      } />
      <Route path="/admin" element={
        isAuthenticated && privateData ? (
          <AdminDashboard 
            publicData={state.publicData} 
            privateData={privateData}
            onUpdatePublic={(d) => setState(s => ({...s, publicData: d}))}
            onUpdatePrivate={(d) => setPrivateData(d)}
            onLogout={() => {
              localStorage.removeItem(AUTH_KEY);
              localStorage.removeItem(`${AUTH_KEY}_expiry`);
              setIsAuthenticated(false);
            }} 
          />
        ) : (
          <Navigate to="/tat" replace />
        )
      } />
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