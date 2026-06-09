import { useCallback, useState } from 'react';

type ConfirmVariant = 'danger' | 'primary';

const noop = () => {};

export const useConfirmDialog = () => {
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: noop,
    variant: 'primary' as ConfirmVariant
  });

  const confirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    variant: ConfirmVariant = 'primary'
  ) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, variant });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmConfig((current) => ({ ...current, isOpen: false }));
  }, []);

  return { confirmConfig, confirm, closeConfirm };
};
