import { useState, useEffect, useCallback } from 'react';
import { listQueue } from './useBrewQueue';
import { syncBrews } from '../services/brewSync';

interface CacheInfo {
  name: string;
  entries: number;
  estimatedBytes: number;
  estimatedSize: string;
}

interface CacheStats {
  caches: CacheInfo[];
  totalEntries: number;
  totalEstimatedBytes: number;
  totalEstimatedSize: string;
  pendingBrews: number;
  loading: boolean;
  refresh: () => Promise<void>;
  clearAllCache: () => Promise<void>;
  clearCacheByName: (name: string) => Promise<void>;
  syncPendingBrews: () => Promise<void>;
  syncing: boolean;
}

const CACHE_LABELS: Record<string, string> = {
  'recipes-cache': 'Recetas (lista)',
  'recipe-details': 'Recetas (detalle)',
  'api-runtime': 'API general',
  'google-fonts': 'Fuentes',
  'unsplash-images': 'Imágenes',
  'workbox-precaching-v2': 'App shell',
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function cacheDisplayName(name: string): string {
  return CACHE_LABELS[name] ?? name;
}

async function estimateCacheSize(
  cache: Cache,
): Promise<{ entries: number; estimatedBytes: number }> {
  const keys = await cache.keys();
  let totalBytes = 0;
  for (const req of keys) {
    try {
      const res = await cache.match(req);
      if (!res) continue;
      const cl = res.headers.get('content-length');
      if (cl) {
        totalBytes += parseInt(cl, 10);
      } else {
        totalBytes += 50 * 1024; // fallback 50 KB per entry
      }
    } catch {
      totalBytes += 50 * 1024;
    }
  }
  return { entries: keys.length, estimatedBytes: totalBytes };
}

const apiAvailable = typeof caches !== 'undefined';

export function useCacheStats(): CacheStats {
  const [cachesList, setCachesList] = useState<CacheInfo[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalEstimatedBytes, setTotalEstimatedBytes] = useState(0);
  const [totalEstimatedSize, setTotalEstimatedSize] = useState('0 B');
  const [pendingBrews, setPendingBrews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!apiAvailable) {
        const queue = await listQueue().catch(() => []);
        const pending = queue.filter(
          (b: { status: string }) => b.status === 'pending' || b.status === 'failed',
        ).length;
        setPendingBrews(pending);
        setCachesList([]);
        setTotalEntries(0);
        setTotalEstimatedBytes(0);
        setTotalEstimatedSize('0 B');
        return;
      }

      const names = await caches.keys();
      const infos: CacheInfo[] = [];
      let entriesSum = 0;
      let bytesSum = 0;

      for (const name of names) {
        const cache = await caches.open(name);
        const { entries, estimatedBytes } = await estimateCacheSize(cache);
        entriesSum += entries;
        bytesSum += estimatedBytes;
        infos.push({
          name: cacheDisplayName(name),
          entries,
          estimatedBytes,
          estimatedSize: formatBytes(estimatedBytes),
        });
      }

      const queue = await listQueue().catch(() => []);
      const pending = queue.filter(
        (b: { status: string }) => b.status === 'pending' || b.status === 'failed',
      ).length;

      setCachesList(infos);
      setTotalEntries(entriesSum);
      setTotalEstimatedBytes(bytesSum);
      setTotalEstimatedSize(formatBytes(bytesSum));
      setPendingBrews(pending);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAllCache = useCallback(async () => {
    if (!apiAvailable) return;
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    await refresh();
  }, [refresh]);

  const clearCacheByName = useCallback(
    async (name: string) => {
      if (!apiAvailable) return;
      // Find the original cache name by matching the display name
      const names = await caches.keys();
      const original = names.find((n) => cacheDisplayName(n) === name) ?? name;
      await caches.delete(original);
      await refresh();
    },
    [refresh],
  );

  const syncPendingBrews = useCallback(async () => {
    setSyncing(true);
    try {
      await syncBrews();
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    caches: cachesList,
    totalEntries,
    totalEstimatedBytes,
    totalEstimatedSize,
    pendingBrews,
    loading,
    refresh,
    clearAllCache,
    clearCacheByName,
    syncPendingBrews,
    syncing,
  };
}
