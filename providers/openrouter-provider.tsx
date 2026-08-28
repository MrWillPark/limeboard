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
import { syncBalanceWidgetDisconnected } from '@/lib/widgets/sync-balance-widget';
import { useScreenshotPreviewOptional } from '@/providers/screenshot-preview-provider';
import { useSession } from '@/providers/session-provider';

type OpenRouterState = {
  ready: boolean;
  apiKey: string | null;
  meta: StoredKeyMeta | null;
  maskedKey: string | null;
  isConnected: boolean;
  /** True when a key is stored — ignores screenshot preview overlay. */
  realIsConnected: boolean;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshMeta: () => Promise<void>;
};

const OpenRouterContext = createContext<OpenRouterState | null>(null);

export function OpenRouterProvider({ children }: PropsWithChildren) {
  const { user, ready: sessionReady } = useSession();
  const userId = user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<StoredKeyMeta | null>(null);
  const preview = useScreenshotPreviewOptional();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!sessionReady) return;

      if (!userId) {
        if (!cancelled) {
          setApiKey(null);
          setMeta(null);
          setReady(true);
        }
        return;
      }

      setReady(false);
      try {
        const [key, keyMeta] = await Promise.all([getApiKey(userId), getKeyMeta(userId)]);
        if (cancelled) return;
        setApiKey(key);
        setMeta(keyMeta);
      } catch (e) {
        console.warn('Failed to restore API key from secure storage', e);
        if (!cancelled) {
          setApiKey(null);
          setMeta(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionReady, userId]);

  const connect = useCallback(
    async (rawKey: string) => {
      if (!userId) throw new Error('Sign in before connecting an OpenRouter key');

      const trimmed = rawKey.trim();
      const info = await validateApiKey(trimmed);
      const nextMeta: StoredKeyMeta = {
        labelHint: info.label,
        savedAt: new Date().toISOString(),
        isManagementKey: info.is_management_key,
        ownerUserId: userId,
      };
      await saveApiKey(trimmed, nextMeta, userId);
      setApiKey(trimmed);
      setMeta(nextMeta);
    },
    [userId]
  );

  const disconnect = useCallback(async () => {
    if (!userId) {
      setApiKey(null);
      setMeta(null);
      return;
    }
    await clearApiKey(userId);
    setApiKey(null);
    setMeta(null);
    syncBalanceWidgetDisconnected();
  }, [userId]);

  const refreshMeta = useCallback(async () => {
    if (!userId) {
      setMeta(null);
      return;
    }
    setMeta(await getKeyMeta(userId));
  }, [userId]);

  const realIsConnected = Boolean(apiKey);
  const previewMode = preview?.mode ?? 'live';
  const displayIsConnected = previewMode === 'no-key' ? false : realIsConnected;

  const value = useMemo<OpenRouterState>(
    () => ({
      ready: sessionReady && ready,
      apiKey,
      meta,
      maskedKey: apiKey ? maskKey(apiKey) : null,
      isConnected: displayIsConnected,
      realIsConnected,
      connect,
      disconnect,
      refreshMeta,
    }),
    [
      sessionReady,
      ready,
      apiKey,
      meta,
      displayIsConnected,
      realIsConnected,
      connect,
      disconnect,
      refreshMeta,
    ]
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
