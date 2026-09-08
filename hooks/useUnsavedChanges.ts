import { useCallback, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export const useUnsavedChanges = (hasChanges: boolean) => {
  const blocker = useBlocker(hasChanges);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useBeforeUnload(useCallback((event: BeforeUnloadEvent) => {
    if (!hasChanges) return;
    event.preventDefault();
    event.returnValue = '';
  }, [hasChanges]));

  const requestLeave = (action: () => void) => {
    if (hasChanges) setPendingAction(() => action);
    else action();
  };

  const confirmLeave = () => {
    if (blocker.state === 'blocked') blocker.proceed();
    else {
      setPendingAction(null);
      pendingAction?.();
    }
  };

  const cancelLeave = () => {
    setPendingAction(null);
    if (blocker.state === 'blocked') blocker.reset();
  };

  return { isOpen: blocker.state === 'blocked' || pendingAction !== null, requestLeave, confirmLeave, cancelLeave };
};
