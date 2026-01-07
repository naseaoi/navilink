import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { AdminDashboard } from './components/AdminDashboard';
import { webdav } from './services/webdavService';
import { AppState, PrivateData } from './types';
import { Button, Input, Card } from './components/UI';
import { ShieldCheck } from 'lucide-react';

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
  const [error, setError] = useState('');
  const handleLogin = () => {
    if (!privateData) return;
    if (username === privateData.admin.username && password === privateData.admin.passwordHash) {
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(`${AUTH_KEY}_expiry`, (new Date().getTime() + 86400000).toString()); // 24h
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

  if (state.isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#1c1917]"><div className="w-10 h-10 border-4 border-stone-900 border-t-transparent rounded-full animate-spin dark:border-stone-100" /></div>;

  return (
    <Routes>
      <Route path="/" element={<PublicView data={state.publicData} />} />
      <Route path="/tat" element={
        isAuthenticated && privateData ? (
          <AdminDashboard 
            publicData={state.publicData} 
            privateData={privateData}
            onUpdatePublic={d=>setState(s=>({...s, publicData:d}))}
            onUpdatePrivate={setPrivateData}
            onLogout={() => { localStorage.removeItem(AUTH_KEY); setIsAuthenticated(false); }} 
          />
        ) : <AdminLogin onLogin={()=>setIsAuthenticated(true)} privateData={privateData} />
      } />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() { return <BrowserRouter><MainApp /></BrowserRouter>; }