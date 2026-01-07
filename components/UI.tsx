import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, ChevronDown, Eye, EyeOff, AlertCircle, CheckCircle2, Info } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', isLoading, className = '', children, ...props }) => {
  const base = "inline-flex items-center justify-center font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:border-white",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5",
    danger: "bg-red-500 text-white hover:bg-red-600 border border-red-500",
    info: "bg-sky-500 text-white hover:bg-sky-600 border border-sky-500",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 border border-transparent"
  };

  const sizes = {
    sm: "px-3 py-2 text-[9px] rounded-lg",
    md: "px-5 py-2.5 text-[10px] rounded-xl",
    lg: "px-7 py-3.5 text-xs rounded-2xl",
    icon: "p-2 rounded-xl w-10 h-10"
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
};

// --- Input ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="mb-2 block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>}
    <input
      className={`flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-0 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 ${className}`}
      {...props}
    />
  </div>
);

// --- Modern Select ---
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && <label className="mb-2 block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs transition-all hover:border-slate-300 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100"
      >
        <span className="truncate font-bold uppercase tracking-tight">{selectedOption?.label || '选择...'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-3xl p-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 dark:bg-slate-900/95 dark:border-white/10">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-colors ${
                value === opt.value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 dark:bg-slate-900 dark:border-white/10">
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50 dark:border-white/5">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-widest uppercase">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all dark:hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        <div className="px-10 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl border border-slate-200/60 shadow-sm dark:bg-slate-950 dark:border-white/10 ${className}`}>
    {children}
  </div>
);

// --- Passwords & Toasts remains similar but with subtle aesthetic tweaks ---
export const ConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; variant?: 'danger' | 'primary'; }> = ({ isOpen, onClose, onConfirm, title, message, variant = 'primary' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 dark:bg-slate-900 dark:border dark:border-white/10 text-center">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs mb-8 font-medium">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Back</Button>
          <Button variant={variant} className="flex-1" onClick={() => { onConfirm(); onClose(); }}>Confirm</Button>
        </div>
      </div>
    </div>
  );
};

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; type: ToastType; message: string; }
export const ToastContainer: React.FC<{ messages: ToastMessage[]; onRemove: (id: number) => void }> = ({ messages, onRemove }) => (
  <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
    {messages.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
    ))}
  </div>
);
const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="pointer-events-auto flex items-center gap-3 px-6 py-2.5 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-500">
      <span className="text-[9px] font-black text-white dark:text-slate-900 uppercase tracking-[0.2em]">{toast.message}</span>
    </div>
  );
};

export const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`flex h-11 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-10 py-2 text-xs transition-all focus:border-indigo-500 focus:ring-0 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 ${className}`}
          {...props}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-500 transition-colors">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};
