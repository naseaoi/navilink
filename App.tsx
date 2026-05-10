import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicView } from './components/PublicView';
import { webdav } from './services/webdavService';
import { AppState, PrivateData } from './types';
import { Button, Input, Card } from './components/UI';
import { ShieldCheck, Compass, CheckSquare, Square } from 'lucide-react';

const AUTH_KEY = 'navilink_auth';
const AUTH_TOKEN_KEY = 'navilink_token';
const AUTH_EXP_KEY = 'navilink_auth_exp';
const AUTH_FORCE_CHANGE_KEY = 'navilink_force_change_password';
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((mod) => ({ default: mod.AdminDashboard })));

const checkAuth = () => {
  const expiry = localStorage.getItem(AUTH_EXP_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!expiry || !token) return false;
  if (Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXP_KEY);
    localStorage.removeItem(AUTH_FORCE_CHANGE_KEY);
    return false;
  }
  return true;
};

const checkPasswordPolicyFlag = () => localStorage.getItem(AUTH_FORCE_CHANGE_KEY) === '1';

const AdminLogin: React.FC<{ onLogin: (mustChangePassword: boolean) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDisabled = !username.trim() || !password;
  
  const handleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember })
      });

      if (!response.ok) throw new Error('Invalid credentials');
      const { token, exp, mustChangePassword } = await response.json();
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_EXP_KEY, String(exp));
      if (mustChangePassword) localStorage.setItem(AUTH_FORCE_CHANGE_KEY, '1');
      else localStorage.removeItem(AUTH_FORCE_CHANGE_KEY);
      onLogin(!!mustChangePassword);
    } catch (e) {
      setError('凭据无效');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-3 rounded-pill border border-subtle bg-surface-raised px-4 py-2 shadow-soft">
                <div className="flex h-9 w-9 items-center justify-center rounded-control bg-gradient-to-br from-stone-900 to-stone-700 text-white shadow-soft dark:from-stone-100 dark:to-stone-300 dark:text-stone-900">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold tracking-tight-display text-1">NaviLink 管理后台</div>
                  <div className="text-[11px] text-3">统一站点内容、分类与存储配置</div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-[34px] leading-tight font-semibold tracking-tight-display text-1">
                  使用同一套视觉语言进入后台编辑区
                </h1>
                <p className="max-w-lg text-[14px] leading-7 text-2">
                  登录后可管理首页卡片、分类、站点信息和 WebDAV 存储模式。当前后台界面已与首页共享同一套中性配色、圆角与层级体系。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-subtle bg-surface-raised p-4 shadow-card">
                  <div className="text-[12px] font-semibold text-1">内容管理</div>
                  <p className="mt-1 text-[12.5px] leading-6 text-2">维护卡片信息、分类顺序和站点文案，改动后立即统一落到当前存储模式。</p>
                </div>
                <div className="rounded-card border border-subtle bg-surface-raised p-4 shadow-card">
                  <div className="text-[12px] font-semibold text-1">安全访问</div>
                  <p className="mt-1 text-[12.5px] leading-6 text-2">后台登录使用令牌鉴权，默认密码场景会在登录后强制提示修改。</p>
                </div>
              </div>
            </div>
          </section>

          <Card className="w-full max-w-md justify-self-center p-8 md:p-9 space-y-7 shadow-popover animate-in zoom-in-95 fade-in duration-300">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-control mx-auto flex items-center justify-center text-white dark:text-stone-900 shadow-soft
                bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300">
                <ShieldCheck size={22} strokeWidth={2.2} />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-3">Admin Access</p>
                <h2 className="text-[20px] font-semibold tracking-tight-display text-1">安全验证</h2>
                <p className="text-[12.5px] leading-6 text-2">请输入授权凭据继续访问后台管理区</p>
              </div>
            </div>

            {error && (
              <div className="rounded-control border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12.5px] font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input label="用户名" placeholder="输入管理员账号" value={username} onChange={e=>setUsername(e.target.value)} />
              <Input label="授权密码" type="password" placeholder="输入登录密码" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-control border border-subtle bg-subtle px-3.5 py-3 text-left text-2 transition-colors hover:border-default hover:text-1"
                onClick={()=>setRemember(!remember)}
              >
                {remember ? <CheckSquare size={16} className="text-1 shrink-0" /> : <Square size={16} className="shrink-0" />}
                <span className="text-[12.5px] font-medium">30 天免登录</span>
              </button>
            </div>

            <Button className="w-full h-11 text-[14px]" onClick={handleLogin} isLoading={isSubmitting} disabled={isDisabled}>
              验证身份
            </Button>

            <p className="text-center text-[11.5px] leading-6 text-3">
              输入的凭据只用于当前站点后台鉴权，不会显示在访客首页。
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const [state, setState] = useState<AppState>({ publicData: { settings: { title: 'NaviLink', icon: '' }, categories: [], cards: [] }, isLoading: true, error: null });
  const [privateData, setPrivateData] = useState<PrivateData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const [mustChangePassword, setMustChangePassword] = useState(checkPasswordPolicyFlag());
  
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
      } catch (e) { setState(prev => ({ ...prev, isLoading: false, error: "无法同步远程数据" })); }
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
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_EXP_KEY);
        localStorage.removeItem(AUTH_FORCE_CHANGE_KEY);
        setPrivateData(null);
        setIsAuthenticated(false);
        setMustChangePassword(false);
      }
    };
    loadPrivate();
  }, [isAuthenticated]);

  // Update document title when settings change
  useEffect(() => {
    if (state.publicData.settings.title) {
      document.title = state.publicData.settings.title;
    }
  }, [state.publicData.settings.title]);

  // Update favicon when settings change
  useEffect(() => {
    const icon = state.publicData.settings.icon;
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    if (icon) {
      if (icon.startsWith('http')) {
        link.href = icon;
      } else { // Assume emoji
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = '48px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, 32, 32);
          link.href = canvas.toDataURL('image/png');
        }
      }
    }
  }, [state.publicData.settings.icon]);

  if (state.isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-canvas gap-4">
      <div className="w-12 h-12 rounded-modal flex items-center justify-center text-white dark:text-stone-900 shadow-soft animate-pulse
        bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300">
        <Compass size={20} strokeWidth={2.2} />
      </div>
      <span className="text-3 text-[11.5px] tracking-wide animate-pulse">加载中</span>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<PublicView data={state.publicData} theme={theme} onToggleTheme={toggleTheme} />} />
      <Route path="/tat" element={
        // Fix flash: If authenticated but privateData not yet loaded, show loading instead of login
        isAuthenticated ? (
          privateData ? (
            <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-canvas"><div className="w-12 h-12 rounded-modal flex items-center justify-center text-white dark:text-stone-900 shadow-soft animate-pulse bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300"><Compass size={20} strokeWidth={2.2} /></div></div>}>
              <AdminDashboard
                publicData={state.publicData}
                privateData={privateData}
                mustChangePassword={mustChangePassword}
                onPasswordPolicyResolved={() => { localStorage.removeItem(AUTH_FORCE_CHANGE_KEY); setMustChangePassword(false); }}
                onUpdatePublic={d=>setState(s=>({...s, publicData:d}))}
                onUpdatePrivate={setPrivateData}
                onLogout={() => { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(AUTH_TOKEN_KEY); localStorage.removeItem(AUTH_EXP_KEY); localStorage.removeItem(AUTH_FORCE_CHANGE_KEY); setIsAuthenticated(false); setMustChangePassword(false); }}
              />
            </Suspense>
          ) : (
            // Re-using the loading spinner style for admin transition
             <div className="h-screen w-screen flex items-center justify-center bg-canvas">
                <div className="w-12 h-12 rounded-modal flex items-center justify-center text-white dark:text-stone-900 shadow-soft animate-pulse
                  bg-gradient-to-br from-stone-900 to-stone-700 dark:from-stone-100 dark:to-stone-300">
                  <Compass size={20} strokeWidth={2.2} />
                </div>
             </div>
          )
        ) : <AdminLogin onLogin={(nextMustChangePassword)=>{ setMustChangePassword(nextMustChangePassword); setIsAuthenticated(true); }} />
      } />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() { return <BrowserRouter><MainApp /></BrowserRouter>; }
