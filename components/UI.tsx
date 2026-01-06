import React, { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown, Eye, EyeOff, AlertCircle, CheckCircle2, Info } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', isLoading, className = '', children, ...props }) => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-100 dark:shadow-none",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

// --- Input ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
    <input
      className={`flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 ${className}`}
      {...props}
    />
  </div>
);

// --- Password Input ---
export const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-2 text-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 ${className}`}
          {...props}
        />
        <button 
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

// --- Select ---
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = '', children, ...props }) => (
  <div className="w-full">
    {label && <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
    <div className="relative">
      <select
        className={`appearance-none flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pr-10 text-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
  </div>
);

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Confirm Modal ---
export const ConfirmModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = '确认', variant = 'primary' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'} dark:bg-opacity-10`}>
            {variant === 'danger' ? <AlertCircle size={32} /> : <Info size={32} />}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">{message}</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>取消</Button>
            <Button variant={variant} className="flex-1" onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Toast ---
export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; type: ToastType; message: string; }

export const ToastContainer: React.FC<{ messages: ToastMessage[]; onRemove: (id: number) => void }> = ({ messages, onRemove }) => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 items-center pointer-events-none">
      {messages.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, []);

  const styles = {
    success: "bg-white border-green-100 text-green-700 dark:bg-slate-900 dark:border-green-900/30 dark:text-green-400",
    error: "bg-white border-red-100 text-red-700 dark:bg-slate-900 dark:border-red-900/30 dark:text-red-400",
    info: "bg-white border-indigo-100 text-indigo-700 dark:bg-slate-900 dark:border-indigo-900/30 dark:text-indigo-400",
  };

  const icons = {
    success: <CheckCircle2 size={18} className="text-green-500" />,
    error: <AlertCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-indigo-500" />,
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-xl animate-in slide-in-from-top-4 duration-300 ${styles[toast.type]}`}>
      {icons[toast.type]}
      <span className="text-sm font-semibold">{toast.message}</span>
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm transition-all dark:bg-slate-900 dark:border-slate-800 ${className}`}>
    {children}
  </div>
);