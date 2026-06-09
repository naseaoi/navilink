import { useCallback, useEffect, useState } from 'react';
import { PrivateData, PublicData } from '../types';

export const useAdminDraft = ({ publicData, privateData }: { publicData: PublicData; privateData: PrivateData }) => {
  const [localPublic, setLocalPublic] = useState<PublicData>(publicData);
  const [localPrivate, setLocalPrivate] = useState<PrivateData>(privateData);
  const [newPassword, setNewPassword] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [hasPublicChanges, setHasPublicChanges] = useState(false);
  const [hasPrivateChanges, setHasPrivateChanges] = useState(false);

  useEffect(() => {
    setLocalPublic(publicData);
    setHasPublicChanges(false);
  }, [publicData]);

  useEffect(() => {
    setLocalPrivate(privateData);
    setNewPassword('');
    setHasPrivateChanges(false);
  }, [privateData]);

  const markChanged = useCallback(() => setHasChanges(true), []);
  const clearChanges = useCallback(() => {
    setHasChanges(false);
    setHasPublicChanges(false);
    setHasPrivateChanges(false);
  }, []);

  const updatePublicDraft = useCallback((data: PublicData) => {
    setLocalPublic(data);
    setHasPublicChanges(true);
    markChanged();
  }, [markChanged]);

  const updatePrivateDraft = useCallback((data: PrivateData) => {
    setLocalPrivate(data);
    setHasPrivateChanges(true);
    markChanged();
  }, [markChanged]);

  const updateNewPassword = useCallback((value: string) => {
    setNewPassword(value);
    setHasPrivateChanges(true);
    markChanged();
  }, [markChanged]);

  const replaceDraft = useCallback((nextPublic: PublicData, nextPrivate: PrivateData) => {
    setLocalPublic(nextPublic);
    setLocalPrivate(nextPrivate);
    setNewPassword('');
    setHasChanges(false);
    setHasPublicChanges(false);
    setHasPrivateChanges(false);
  }, []);

  return {
    localPublic,
    localPrivate,
    newPassword,
    hasChanges,
    hasPublicChanges,
    hasPrivateChanges,
    setLocalPublic,
    setLocalPrivate,
    setNewPassword,
    updatePublicDraft,
    updatePrivateDraft,
    updateNewPassword,
    replaceDraft,
    clearChanges
  };
};
