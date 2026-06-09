import { useCallback, useEffect, useState } from 'react';
import { PrivateData, PublicData } from '../types';
import { webdav } from '../services/webdavService';

type StorageMode = 'local' | 'webdav';
type SyncDirection = 'none' | 'localToWebdav' | 'webdavToLocal';

interface StorageStatus {
  local: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null };
  webdav: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null };
  available: { local: boolean; webdav: boolean };
}

export const useStorageStatus = ({
  showToast,
  hasChanges,
  confirm,
  replaceDraft,
  onUpdatePublic,
  onUpdatePrivate
}: {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hasChanges: boolean;
  confirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'primary') => void;
  replaceDraft: (publicData: PublicData, privateData: PrivateData) => void;
  onUpdatePublic: (data: PublicData) => void;
  onUpdatePrivate: (data: PrivateData) => void;
}) => {
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [storageAvailable, setStorageAvailable] = useState<{ local: boolean; webdav: boolean }>({ local: true, webdav: false });
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [syncing, setSyncing] = useState<SyncDirection>('none');

  const refreshRemoteData = useCallback(async () => {
    const publicData = await webdav.fetchPublicData();
    const privateData = await webdav.fetchPrivateData();
    replaceDraft(publicData, privateData);
    onUpdatePublic(publicData);
    onUpdatePrivate(privateData);
  }, [onUpdatePrivate, onUpdatePublic, replaceDraft]);

  const refreshStorageStatus = useCallback(async () => {
    try {
      const status = await webdav.getStorageStatus();
      setStorageStatus(status);
    } catch (error) {
      showToast('获取存储状态失败', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const info = await webdav.getStorageMode();
        setStorageMode(info.mode);
        setStorageAvailable(info.available);
        const status = await webdav.getStorageStatus();
        setStorageStatus(status);
      } catch (error) {
        showToast('获取存储信息失败', 'error');
      }
    };
    loadStorage();
  }, [showToast]);

  const handleStorageModeChange = useCallback(async (mode: StorageMode) => {
    const changeMode = async () => {
      setStorageLoading(true);
      try {
        const info = await webdav.setStorageMode(mode);
        setStorageMode(info.mode);
        setStorageAvailable(info.available);
        await refreshRemoteData();
        await refreshStorageStatus();
        showToast('存储模式已切换', 'success');
      } catch (error) {
        showToast('切换存储模式失败', 'error');
      } finally {
        setStorageLoading(false);
      }
    };

    if (hasChanges) {
      confirm('放弃未保存更改', '切换存储模式会重新加载数据。', changeMode, 'danger');
      return;
    }

    await changeMode();
  }, [confirm, hasChanges, refreshRemoteData, refreshStorageStatus, showToast]);

  const handleStorageSync = useCallback((from: StorageMode, to: StorageMode) => {
    const labelFrom = from === 'webdav' ? 'WebDAV' : '本地';
    const labelTo = to === 'webdav' ? 'WebDAV' : '本地';
    confirm(
      '覆盖数据',
      `将用 ${labelFrom} 数据覆盖 ${labelTo}，此操作不可撤销。`,
      async () => {
        setSyncing(from === 'webdav' ? 'webdavToLocal' : 'localToWebdav');
        try {
          await webdav.syncStorage(from, to);
          await refreshRemoteData();
          await refreshStorageStatus();
          showToast('数据同步完成', 'success');
        } catch (error) {
          showToast('数据同步失败', 'error');
        } finally {
          setSyncing('none');
        }
      },
      'danger'
    );
  }, [confirm, refreshRemoteData, refreshStorageStatus, showToast]);

  return {
    storageMode,
    storageAvailable,
    storageStatus,
    storageLoading,
    syncing,
    refreshStorageStatus,
    handleStorageModeChange,
    handleStorageSync
  };
};
