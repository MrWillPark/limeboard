import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearApiKey,
  getApiKey,
  getKeyMeta,
  maskKey,
  saveApiKey,
  type StoredKeyMeta,
} from '@/lib/auth/secure-key';
import { validateApiKey } from '@/lib/openrouter/client';

type OpenRouterState = {
  ready: boolean;
  apiKey: string | null;
  meta: StoredKeyMeta | null;
  maskedKey: string | null;
  isConnected: boolean;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshMeta: () => Promise<void>;
};

const OpenRouterContext = createContext<OpenRouterState | null>(null);

export function OpenRouterProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<StoredKeyMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [key, keyMeta] = await Promise.all([getApiKey(), getKeyMeta()]);
        if (cancelled) return;
        setApiKey(key);
        setMeta(keyMeta);
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
    const info = await validateApiKey(rawKey);
    const nextMeta: StoredKeyMeta = {
      labelHint: info.label,
      savedAt: new Date().toISOString(),
      isManagementKey: info.is_management_key,
    };
    await saveApiKey(rawKey, nextMeta);
    setApiKey(rawKey.trim());
    setMeta(nextMeta);
  }, []);

  const disconnect = useCallback(async () => {
    await clearApiKey();
    setApiKey(null);
    setMeta(null);
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
      connect,
      disconnect,
      refreshMeta,
    }),
    [ready, apiKey, meta, connect, disconnect, refreshMeta]
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
