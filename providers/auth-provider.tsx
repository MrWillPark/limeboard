import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearApiKey,
  getApiKey,
  getKeyMeta,
  maskKey,
  saveApiKey,
  type StoredKeyMeta,
} from '@/lib/auth/secure-key';
import { validateApiKey } from '@/lib/openrouter/client';

type AuthState = {
  ready: boolean;
  apiKey: string | null;
  meta: StoredKeyMeta | null;
  maskedKey: string | null;
  isConnected: boolean;
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshMeta: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<StoredKeyMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [key, keyMeta] = await Promise.all([getApiKey(), getKeyMeta()]);
      if (cancelled) return;
      setApiKey(key);
      setMeta(keyMeta);
      setReady(true);
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

  const value = useMemo<AuthState>(
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
