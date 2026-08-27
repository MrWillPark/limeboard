import * as SecureStore from 'expo-secure-store';

const KEY_STORAGE = 'limeboard.openrouter.api_key';
const KEY_META = 'limeboard.openrouter.key_meta';

export type StoredKeyMeta = {
  labelHint: string;
  savedAt: string;
  isManagementKey: boolean;
  /** Unlocks Pro + management UI when the owner admin key is connected. */
  isAdminKey?: boolean;
};

async function canUseSecureStore(): Promise<boolean> {
  if (process.env.EXPO_OS === 'web') return false;
  return SecureStore.isAvailableAsync();
}

export async function saveApiKey(apiKey: string, meta: StoredKeyMeta): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('API key is empty');

  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(KEY_STORAGE, trimmed, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(KEY_META, JSON.stringify(meta));
    return;
  }

  // Web / Expo web fallback — session only, never ideal for secrets
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(KEY_STORAGE, trimmed);
    sessionStorage.setItem(KEY_META, JSON.stringify(meta));
  }
}

export async function getApiKey(): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(KEY_STORAGE);
  }
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(KEY_STORAGE);
  }
  return null;
}

export async function getKeyMeta(): Promise<StoredKeyMeta | null> {
  let raw: string | null = null;
  if (await canUseSecureStore()) {
    raw = await SecureStore.getItemAsync(KEY_META);
  } else if (typeof sessionStorage !== 'undefined') {
    raw = sessionStorage.getItem(KEY_META);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredKeyMeta;
  } catch {
    return null;
  }
}

export async function clearApiKey(): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(KEY_STORAGE);
    await SecureStore.deleteItemAsync(KEY_META);
    return;
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(KEY_STORAGE);
    sessionStorage.removeItem(KEY_META);
  }
}

export function maskKey(key: string): string {
  if (key.length < 12) return '••••••••';
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}
