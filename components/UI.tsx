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
  // 现代精致:统一弹性曲线 + 柔和阴影 + 微缩放反馈
  const base = "inline-flex items-center justify-center font-medium transition-all duration-200 ease-spring focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

  const variants = {
    primary: "bg-stone-900 text-white hover:bg-stone-800 shadow-soft dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200",
    secondary: "bg-surface text-1 border border-subtle hover:border-default hover:bg-subtle dark:bg-stone-900 dark:hover:bg-stone-800",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-soft",
    info: "bg-accent text-white hover:bg-accent-hover shadow-soft",
    ghost: "bg-transparent text-2 hover:bg-subtle hover:text-1"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-control",
    md: "px-4 py-2.5 text-[13.5px] rounded-control",
    lg: "px-6 py-3 text-[14.5px] rounded-control",
    icon: "p-2 rounded-control w-10 h-10"
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
    {label && <label className="mb-1.5 block text-[12.5px] font-medium text-2">{label}</label>}
    <input
      className={`flex h-11 w-full rounded-control border border-subtle bg-surface px-3.5 text-[13.5px] text-1
        transition-all duration-200 placeholder:text-3
        hover:border-default focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none ${className}`}
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
      {label && <label className="mb-1.5 block text-[12.5px] font-medium text-2">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-control border border-subtle bg-surface px-3.5 text-[13.5px] text-1
          transition-all duration-200 hover:border-default focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15"
      >
        <span className="truncate font-medium">{selectedOption?.label || '请选择'}</span>
        <ChevronDown size={15} className={`text-3 transition-transform duration-200 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-control
          border border-subtle bg-surface-raised shadow-popover
          animate-in fade-in slide-in-from-top-2 duration-200 min-w-full w-max p-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                value === opt.value ? 'bg-accent-soft text-accent' : 'text-2 hover:bg-subtle hover:text-1'
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
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-raised rounded-modal shadow-popover overflow-hidden
          animate-in zoom-in-95 fade-in duration-200 border border-subtle"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <h3 className="text-[15px] font-semibold tracking-tight-display text-1">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-pill flex items-center justify-center text-3 hover:text-1 hover:bg-subtle transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  ), document.body);
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-surface-raised rounded-card border border-subtle shadow-card ${className}`}>
    {children}
  </div>
);

export const ConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; variant?: 'danger' | 'primary'; }> = ({ isOpen, onClose, onConfirm, title, message, variant = 'primary' }) => {
  if (!isOpen) return null;
  return createPortal((
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-raised rounded-modal shadow-popover p-7
          animate-in zoom-in-95 fade-in duration-200 border border-subtle text-center"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[15.5px] font-semibold tracking-tight-display text-1 mb-2">{title}</h3>
        <p className="text-2 text-[13px] mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>取消</Button>
          <Button variant={variant} className="flex-1" onClick={() => { onConfirm(); onClose(); }}>确认</Button>
        </div>
      </div>
    </div>
  ), document.body);
};

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; type: ToastType; message: string; }
export const ToastContainer: React.FC<{ messages: ToastMessage[]; onRemove: (id: number) => void }> = ({ messages, onRemove }) => (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2.5 items-center pointer-events-none">
    {messages.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
    ))}
  </div>
);
const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [onRemove, toast.id]);
  return (
    <div className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-pill
      bg-stone-900 text-white shadow-popover animate-in slide-in-from-top-4 fade-in duration-300
      dark:bg-stone-100 dark:text-stone-900">
      <span className="text-[13px] font-medium">{toast.message}</span>
    </div>
  );
};

export const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-[12.5px] font-medium text-2">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`flex h-11 w-full rounded-control border border-subtle bg-surface pl-3.5 pr-10 text-[13.5px] text-1
            transition-all duration-200 placeholder:text-3
            hover:border-default focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none ${className}`}
          {...props}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-3 hover:text-1 hover:bg-subtle transition-colors">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};
