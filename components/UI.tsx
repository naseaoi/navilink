import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { createPortal } from 'react-dom';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', isLoading, className = '', children, ...props }) => {
  const base = "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-stone-400/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200",
    secondary: "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800",
    danger: "bg-red-600 text-white hover:bg-red-700",
    info: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-lg",
    lg: "px-8 py-3 text-base rounded-xl",
    icon: "p-2 rounded-lg w-10 h-10"
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
    {label && <label className="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">{label}</label>}
    <input
      className={`flex h-11 w-full rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm transition-all placeholder:text-stone-400 focus:border-stone-500 focus:ring-0 focus:outline-none dark:bg-stone-950 dark:border-stone-800 dark:text-stone-100 ${className}`}
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
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm transition-all hover:border-stone-300 dark:bg-stone-950 dark:border-stone-800 dark:text-stone-100"
      >
        <span className="truncate font-medium">{selectedOption?.label || '请选择 Select...'}</span>
        <ChevronDown size={16} className={`text-stone-400 transition-transform duration-200 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 dark:bg-stone-900 dark:border-stone-800 min-w-full w-max">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                value === opt.value ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100' : 'text-stone-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800'
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
  return createPortal((
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/35 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 dark:bg-stone-900 dark:border dark:border-stone-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 dark:border-stone-800">
          <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all dark:hover:bg-stone-800">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  ), document.body);
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-stone-200 shadow-sm dark:bg-stone-900 dark:border-stone-800 ${className}`}>
    {children}
  </div>
);

export const ConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; variant?: 'danger' | 'primary'; }> = ({ isOpen, onClose, onConfirm, title, message, variant = 'primary' }) => {
  if (!isOpen) return null;
  return createPortal((
    <div 
      className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-stone-900/35 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 dark:bg-stone-900 dark:border dark:border-stone-800 text-center"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">{title}</h3>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">{message}</p>
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>取消 Cancel</Button>
          <Button variant={variant} className="flex-1" onClick={() => { onConfirm(); onClose(); }}>确认 Confirm</Button>
        </div>
      </div>
    </div>
  ), document.body);
};

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; type: ToastType; message: string; }
export const ToastContainer: React.FC<{ messages: ToastMessage[]; onRemove: (id: number) => void }> = ({ messages, onRemove }) => (
  <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 items-center pointer-events-none">
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
    <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-lg bg-stone-900 text-white shadow-xl animate-in slide-in-from-top-4 duration-300">
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
};

export const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`flex h-11 w-full rounded-lg border border-stone-200 bg-white pl-4 pr-10 py-2 text-sm transition-all focus:border-stone-500 focus:ring-0 focus:outline-none dark:bg-stone-950 dark:border-stone-800 dark:text-stone-100 ${className}`}
          {...props}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};
