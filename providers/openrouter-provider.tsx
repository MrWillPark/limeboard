import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  clearApiKey,
  getApiKey,
  getKeyMeta,
  maskKey,
  saveApiKey,
  type StoredKeyMeta,
} from '@/lib/auth/secure-key';
import { validateApiKey } from '@/lib/openrouter/client';
import { isOpenRouterAuthError, isOpenRouterNetworkError } from '@/lib/openrouter/errors';
import { syncBalanceWidgetDisconnected, syncBalanceWidgetLoading } from '@/lib/widgets/sync-balance-widget';
import {
  syncDeskMonitorWidgetDisconnected,
  syncDeskMonitorWidgetLoading,
} from '@/lib/widgets/sync-desk-monitor-widget';
import { bootstrapWidgetLayouts } from '@/lib/widgets/widget-runtime';
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
  /** Set when a stored key was rejected by OpenRouter on load. */
  keyRejectedMessage: string | null;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshMeta: () => Promise<void>;
  clearKeyRejectedMessage: () => void;
};

const OpenRouterContext = createContext<OpenRouterState | null>(null);

async function loadValidatedKey(userId: string): Promise<{
  key: string | null;
  meta: StoredKeyMeta | null;
  rejected: string | null;
}> {
  const stored = await getApiKey(userId);
  if (!stored) return { key: null, meta: null, rejected: null };

  try {
    const info = await validateApiKey(stored);
    const meta: StoredKeyMeta = {
      labelHint: info.label,
      savedAt: new Date().toISOString(),
      isManagementKey: info.is_management_key,
      ownerUserId: userId,
    };
    await saveApiKey(stored, meta, userId);
    return { key: stored, meta, rejected: null };
  } catch (error) {
    if (isOpenRouterAuthError(error)) {
      // Keep the key in SecureStore — only explicit disconnect removes it.
      // Build 10 previously deleted keys here, which made logout/login look like data loss.
      const meta = await getKeyMeta(userId);
      const message =
        error instanceof Error ? error.message : 'OpenRouter rejected this API key';
      return {
        key: stored,
        meta,
        rejected: `${message}. Remove the key in Settings and reconnect if this persists.`,
      };
    }

    if (isOpenRouterNetworkError(error)) {
      const meta = await getKeyMeta(userId);
      return { key: stored, meta, rejected: null };
    }

    throw error;
  }
}

export function OpenRouterProvider({ children }: PropsWithChildren) {
  const { user, ready: sessionReady } = useSession();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<StoredKeyMeta | null>(null);
  const [keyRejectedMessage, setKeyRejectedMessage] = useState<string | null>(null);
  const preview = useScreenshotPreviewOptional();

  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['openrouter'] });
  }, [userId, queryClient]);

  useEffect(() => {
    if (!sessionReady) return;

    bootstrapWidgetLayouts();

    if (!userId) {
      syncBalanceWidgetDisconnected();
      syncDeskMonitorWidgetDisconnected();
      return;
    }

    if (!apiKey) {
      syncBalanceWidgetDisconnected();
      syncDeskMonitorWidgetDisconnected();
      return;
    }

    syncBalanceWidgetLoading();
    syncDeskMonitorWidgetLoading();
  }, [sessionReady, userId, apiKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!sessionReady) return;

      setApiKey(null);
      setMeta(null);
      setKeyRejectedMessage(null);

      if (!userId) {
        if (!cancelled) setReady(true);
        return;
      }

      setReady(false);
      try {
        const loaded = await loadValidatedKey(userId);
        if (cancelled) return;
        setApiKey(loaded.key);
        setMeta(loaded.meta);
        setKeyRejectedMessage(loaded.rejected);
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
      setKeyRejectedMessage(null);
      setApiKey(trimmed);
      setMeta(nextMeta);
      queryClient.removeQueries({ queryKey: ['openrouter'] });
    },
    [userId, queryClient]
  );

  const disconnect = useCallback(async () => {
    if (!userId) {
      setApiKey(null);
      setMeta(null);
      setKeyRejectedMessage(null);
      return;
    }
    await clearApiKey(userId);
    setApiKey(null);
    setMeta(null);
    setKeyRejectedMessage(null);
    queryClient.removeQueries({ queryKey: ['openrouter'] });
    syncBalanceWidgetDisconnected();
    syncDeskMonitorWidgetDisconnected();
  }, [userId, queryClient]);

  const refreshMeta = useCallback(async () => {
    if (!userId) {
      setMeta(null);
      return;
    }
    setMeta(await getKeyMeta(userId));
  }, [userId]);

  const clearKeyRejectedMessage = useCallback(() => {
    setKeyRejectedMessage(null);
  }, []);

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
      keyRejectedMessage,
      connect,
      disconnect,
      refreshMeta,
      clearKeyRejectedMessage,
    }),
    [
      sessionReady,
      ready,
      apiKey,
      meta,
      displayIsConnected,
      realIsConnected,
      keyRejectedMessage,
      connect,
      disconnect,
      refreshMeta,
      clearKeyRejectedMessage,
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
