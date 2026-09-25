import { useEffect, useRef } from 'react';

const dialogs: HTMLElement[] = [];
const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export const useDialogFocus = (isOpen: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogs.push(dialog);
    const items = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((item) => item.getClientRects().length && item.tabIndex >= 0);
    const focusFirst = () => (items()[0] || dialog).focus();
    (dialog.querySelector<HTMLElement>('input, textarea') || items()[0] || dialog).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== dialog || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === 'Tab') {
        const controls = items();
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (dialogs.at(-1) === dialog && !dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', handleFocus);
    return () => {
      dialogs.splice(dialogs.indexOf(dialog), 1);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', handleFocus);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);
  return ref;
};
