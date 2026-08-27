import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { enrichKeyMeta, isAdminApiKey } from '@/lib/auth/admin-key';
import {
  clearApiKey,
  getApiKey,
  getKeyMeta,
  maskKey,
  saveApiKey,
  type StoredKeyMeta,
} from '@/lib/auth/secure-key';
import { validateApiKey } from '@/lib/openrouter/client';
import { syncBalanceWidgetDisconnected } from '@/lib/widgets/sync-balance-widget';

type OpenRouterState = {
  ready: boolean;
  apiKey: string | null;
  meta: StoredKeyMeta | null;
  maskedKey: string | null;
  isConnected: boolean;
  isAdminKey: boolean;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshMeta: () => Promise<void>;
};

const OpenRouterContext = createContext<OpenRouterState | null>(null);

export function OpenRouterProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<StoredKeyMeta | null>(null);
  const [isAdminKey, setIsAdminKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [key, keyMeta] = await Promise.all([getApiKey(), getKeyMeta()]);
        if (cancelled) return;

        if (!key) {
          setApiKey(null);
          setMeta(null);
          setIsAdminKey(false);
          return;
        }

        const admin = await isAdminApiKey(key);
        const restoredMeta = keyMeta
          ? enrichKeyMeta(key, keyMeta, admin)
          : null;

        if (
          restoredMeta &&
          admin &&
          (!keyMeta?.isAdminKey || !keyMeta?.isManagementKey)
        ) {
          await saveApiKey(key, restoredMeta);
        }

        setApiKey(key);
        setMeta(restoredMeta);
        setIsAdminKey(admin);
      } catch (e) {
        console.warn('Failed to restore API key from secure storage', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (rawKey: string) => {
    const trimmed = rawKey.trim();
    const info = await validateApiKey(trimmed);
    const admin = await isAdminApiKey(trimmed);
    const nextMeta = enrichKeyMeta(trimmed, {
      labelHint: info.label,
      savedAt: new Date().toISOString(),
      isManagementKey: info.is_management_key,
    }, admin);
    await saveApiKey(trimmed, nextMeta);
    setApiKey(trimmed);
    setMeta(nextMeta);
    setIsAdminKey(admin);
  }, []);

  const disconnect = useCallback(async () => {
    await clearApiKey();
    setApiKey(null);
    setMeta(null);
    setIsAdminKey(false);
    syncBalanceWidgetDisconnected();
  }, []);

  const refreshMeta = useCallback(async () => {
    setMeta(await getKeyMeta());
  }, []);

  const value = useMemo<OpenRouterState>(
    () => ({
      ready,
      apiKey,
      meta,
      maskedKey: apiKey ? maskKey(apiKey) : null,
      isConnected: Boolean(apiKey),
      isAdminKey,
      connect,
      disconnect,
      refreshMeta,
    }),
    [ready, apiKey, meta, isAdminKey, connect, disconnect, refreshMeta]
  );

  return <OpenRouterContext.Provider value={value}>{children}</OpenRouterContext.Provider>;
}

export function useOpenRouter() {
  const ctx = useContext(OpenRouterContext);
  if (!ctx) throw new Error('useOpenRouter must be used within OpenRouterProvider');
  return ctx;
}

/** @deprecated Use useOpenRouter */
export const useAuth = useOpenRouter;
