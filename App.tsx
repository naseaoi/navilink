
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { AdminDashboard } from './components/AdminDashboard';
import { webdav } from './services/webdavService';
import { AppState, PublicData, PrivateData } from './types';
// Removed non-exported Loader2 as it is not used in this file
import { Button, Input, Card } from './components/UI';
import { Lock, ShieldCheck } from 'lucide-react';

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
    if (!privateData) {
      setError("管理员数据尚未加载。");
      return;
    }
    
    if (username === privateData.admin.username && password === privateData.admin.passwordHash) {
      localStorage.setItem(AUTH_KEY, 'true');
      const expiryDays = remember ? 30 : 1;
      const date = new Date();
      date.setDate(date.getDate() + expiryDays);
      localStorage.setItem(`${AUTH_KEY}_expiry`, date.getTime().toString());
      onLogin();
    } else {
      setError("账号或密码错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm p-10 space-y-8 animate-in zoom-in duration-500">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-600/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">安全中心</h2>
          <p className="text-slate-500 text-sm dark:text-slate-400 font-medium">请输入凭据以访问管理后台</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl border border-red-100 animate-in shake duration-300 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400">{error}</div>}

        <div className="space-y-6">
          <Input 
            label="用户名" 
            placeholder="Username"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <Input 
            label="密码" 
            type="password" 
            placeholder="Password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="remember" 
              className="w-4 h-4 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className="text-sm font-bold text-slate-500 dark:text-slate-400">保持 30 天登录</label>
          </div>
        </div>

        <Button className="w-full py-4 h-auto text-base font-black shadow-lg shadow-indigo-600/20" onClick={handleLogin}>验证并登录</Button>
      </Card>
    </div>
  );
};

// --- Main App Logic ---
const MainApp = () => {
  const [state, setState] = useState<AppState>({
    publicData: { settings: { title: 'NaviLink', icon: '' }, categories: [], cards: [] },
    isLoading: true,
    error: null
  });
  
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());

  // --- Dynamic Site Metadata Sync ---
  useEffect(() => {
    const { title, icon } = state.publicData.settings;
    if (title) {
      document.title = title;
    }
    
    // Update Favicon
    if (icon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      if (icon.startsWith('http')) {
        link.href = icon;
      } else {
        // SVG favicon from emoji
        link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${icon}</text></svg>`;
      }
    }
  }, [state.publicData.settings]);

  useEffect(() => {
    const init = async () => {
      try {
        const pub = await webdav.fetchPublicData();
        setState(prev => ({ ...prev, publicData: pub, isLoading: false }));
        const priv = await webdav.fetchPrivateData();
        setPrivateData(priv);
      } catch (e) {
        setState(prev => ({ ...prev, isLoading: false, error: "无法加载配置数据" }));
      }
    };
    init();
  }, []);

  if (state.isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 animate-bounce shadow-2xl shadow-indigo-600/30">
          <ShieldCheck size={32} />
        </div>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse">正在加载 NaviLink...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950">
        <div className="p-8 bg-white rounded-3xl border border-red-100 shadow-xl max-w-sm dark:bg-slate-900 dark:border-red-900/30">
           <h3 className="text-xl font-bold text-red-600 mb-2">服务加载失败</h3>
           <p className="text-slate-500 text-sm mb-6">{state.error}</p>
           <Button onClick={() => window.location.reload()}>重新连接</Button>
        </div>
      </div>
    );
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
