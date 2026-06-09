import React, { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { Button, Input, PasswordInput } from '../UI';
import { saveAuthSession } from '../../services/authSession';

const loginCardClass =
  'w-full max-w-md rounded-3xl border border-[rgb(var(--border-subtle)/0.58)] bg-surface/95 p-8 shadow-popover dark:border-[rgb(var(--border-default)/0.36)] md:p-9';

export const AdminLogin: React.FC<{ onLogin: (mustChangePassword: boolean) => void }> = ({ onLogin }) => {
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
      saveAuthSession(token, exp, !!mustChangePassword);
      onLogin(!!mustChangePassword);
    } catch (e) {
      setError('凭据无效');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-10">
        <div className={loginCardClass}>
          <div className="space-y-7">
            <div className="space-y-4 text-center">
              <button
                type="button"
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[rgb(var(--border-subtle)/0.58)] bg-surface text-[34px] font-bold leading-none tracking-tightest text-1 shadow-card dark:border-[rgb(var(--border-default)/0.36)]"
                aria-label="NaviLink"
              >
                N<span className="text-accent">.</span>
              </button>
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-3">Admin Access</p>
                <h1 className="text-[22px] font-semibold tracking-tight-display text-1">后台登录</h1>
                <p className="text-[12.5px] leading-6 text-2">请输入管理员账号和密码</p>
              </div>
            </div>

            {error && (
              <div className="rounded-control border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12.5px] font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input label="用户名" placeholder="输入管理员账号" value={username} onChange={e => setUsername(e.target.value)} />
              <PasswordInput
                label="密码"
                placeholder="输入登录密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-control border border-[rgb(var(--border-subtle)/0.58)] bg-subtle px-3.5 py-3 text-left text-2 transition-colors hover:border-[rgb(var(--border-default)/0.58)] hover:text-1 dark:border-[rgb(var(--border-default)/0.36)]"
                onClick={() => setRemember(!remember)}
              >
                {remember ? <CheckSquare size={16} className="shrink-0 text-1" /> : <Square size={16} className="shrink-0" />}
                <span className="text-[12.5px] font-medium">30 天免登录</span>
              </button>
            </div>

            <Button className="h-11 w-full text-[14px]" onClick={handleLogin} isLoading={isSubmitting} disabled={isDisabled}>
              登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
