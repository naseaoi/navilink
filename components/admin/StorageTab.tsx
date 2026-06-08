import React from 'react';
import { Database, Layers } from 'lucide-react';
import { Button, Card, Select } from '../UI';

interface StorageStatus {
  local: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null };
  webdav: { publicUpdatedAt?: number | null; privateUpdatedAt?: number | null };
  available: { local: boolean; webdav: boolean };
}

interface StorageTabProps {
  storageMode: 'local' | 'webdav';
  storageAvailable: { local: boolean; webdav: boolean };
  storageStatus: StorageStatus | null;
  onChangeMode: (mode: 'local' | 'webdav') => void;
  onSync: (from: 'local' | 'webdav', to: 'local' | 'webdav') => void;
  isLoading: boolean;
  syncing: 'none' | 'localToWebdav' | 'webdavToLocal';
}

type StorageMode = 'local' | 'webdav';

const formatTime = (value?: number | null) => {
  if (!value) return '未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知';
  return date.toLocaleString('zh-CN');
};

export const StorageTab: React.FC<StorageTabProps> = ({
  storageMode,
  storageAvailable,
  storageStatus,
  onChangeMode,
  onSync,
  isLoading,
  syncing
}) => {
  const options: { value: StorageMode; label: string }[] = [{ value: 'local', label: '本地存储' }];
  if (storageAvailable.webdav) options.push({ value: 'webdav', label: 'WebDAV' });

  const handleModeChange = (mode: string) => {
    if (mode === 'local' || mode === 'webdav') onChangeMode(mode);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="p-8 space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-1"><Database size={18}/> 存储模式</h3>
        <Select
          label="当前存储模式"
          options={options}
          value={storageMode}
          onChange={handleModeChange}
          className="w-full"
        />
        <p className="text-xs text-3">访客读取会跟随当前模式。</p>
        {!storageAvailable.webdav && (
          <p className="text-xs text-amber-600">WebDAV 未配置，仅支持本地存储。</p>
        )}
        <div className="text-xs text-3">
          {isLoading ? '切换中...' : `当前生效：${storageMode === 'webdav' ? 'WebDAV' : '本地'}`}
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-1"><Layers size={18}/> 数据覆盖</h3>
        <div className="grid gap-3">
          <Button
            variant="danger"
            onClick={() => onSync('webdav', 'local')}
            disabled={!storageAvailable.webdav}
            isLoading={syncing === 'webdavToLocal'}
          >
            WebDAV 覆盖本地
          </Button>
          <Button
            variant="danger"
            onClick={() => onSync('local', 'webdav')}
            disabled={!storageAvailable.webdav}
            isLoading={syncing === 'localToWebdav'}
          >
            本地覆盖 WebDAV
          </Button>
        </div>
        <p className="text-xs text-3">覆盖会更新目标侧的更新时间。</p>
      </Card>

      <Card className="p-8 space-y-6 lg:col-span-2">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-1"><Database size={18}/> 更新时间</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-3">本地</div>
            <div className="text-sm text-2">public.json: {formatTime(storageStatus?.local.publicUpdatedAt)}</div>
            <div className="text-sm text-2">private.json: {formatTime(storageStatus?.local.privateUpdatedAt)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-3">WebDAV</div>
            <div className="text-sm text-2">public.json: {formatTime(storageStatus?.webdav.publicUpdatedAt)}</div>
            <div className="text-sm text-2">private.json: {formatTime(storageStatus?.webdav.privateUpdatedAt)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
