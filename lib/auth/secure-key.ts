import * as SecureStore from 'expo-secure-store';

const LEGACY_KEY_STORAGE = 'limeboard.openrouter.api_key';
const LEGACY_KEY_META = 'limeboard.openrouter.key_meta';

export type StoredKeyMeta = {
  labelHint: string;
  savedAt: string;
  isManagementKey: boolean;
  ownerUserId?: string;
};

function storageKeys(userId: string) {
  return {
    key: `limeboard.openrouter.api_key.${userId}`,
    meta: `limeboard.openrouter.key_meta.${userId}`,
  };
}

async function canUseSecureStore(): Promise<boolean> {
  if (process.env.EXPO_OS === 'web') return false;
  return SecureStore.isAvailableAsync();
}

async function readPair(keyId: string, metaId: string): Promise<{ key: string | null; meta: StoredKeyMeta | null }> {
  let key: string | null = null;
  let rawMeta: string | null = null;

  if (await canUseSecureStore()) {
    key = await SecureStore.getItemAsync(keyId);
    rawMeta = await SecureStore.getItemAsync(metaId);
  } else if (typeof sessionStorage !== 'undefined') {
    key = sessionStorage.getItem(keyId);
    rawMeta = sessionStorage.getItem(metaId);
  }

  if (!rawMeta) return { key, meta: null };
  try {
    return { key, meta: JSON.parse(rawMeta) as StoredKeyMeta };
  } catch {
    return { key, meta: null };
  }
}

async function writePair(
  keyId: string,
  metaId: string,
  apiKey: string,
  meta: StoredKeyMeta
): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(keyId, apiKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(metaId, JSON.stringify(meta));
    return;
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(keyId, apiKey);
    sessionStorage.setItem(metaId, JSON.stringify(meta));
  }
}

async function deletePair(keyId: string, metaId: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(keyId);
    await SecureStore.deleteItemAsync(metaId);
    return;
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(keyId);
    sessionStorage.removeItem(metaId);
  }
}

/** Move a device-global key (pre-v1.1) onto the signed-in user once. */
async function migrateLegacyKey(userId: string): Promise<{ key: string | null; meta: StoredKeyMeta | null }> {
  const legacy = await readPair(LEGACY_KEY_STORAGE, LEGACY_KEY_META);
  if (!legacy.key) return { key: null, meta: null };

  const meta: StoredKeyMeta = {
    ...(legacy.meta ?? {
      labelHint: 'OpenRouter',
      savedAt: new Date().toISOString(),
      isManagementKey: false,
    }),
    ownerUserId: userId,
  };

  const { key: keyId, meta: metaId } = storageKeys(userId);
  await writePair(keyId, metaId, legacy.key, meta);
  await deletePair(LEGACY_KEY_STORAGE, LEGACY_KEY_META);
  return { key: legacy.key, meta };
}

export async function saveApiKey(
  apiKey: string,
  meta: StoredKeyMeta,
  userId: string
): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('API key is empty');
  if (!userId) throw new Error('Sign in before saving an API key');

  const { key: keyId, meta: metaId } = storageKeys(userId);
  await writePair(keyId, metaId, trimmed, { ...meta, ownerUserId: userId });
}

export async function getApiKey(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;

  const { key: keyId, meta: metaId } = storageKeys(userId);
  const stored = await readPair(keyId, metaId);
  if (stored.key) return stored.key;

  const migrated = await migrateLegacyKey(userId);
  return migrated.key;
}

export async function getKeyMeta(
  userId: string | null | undefined
): Promise<StoredKeyMeta | null> {
  if (!userId) return null;

  const { key: keyId, meta: metaId } = storageKeys(userId);
  const stored = await readPair(keyId, metaId);
  if (stored.meta) return stored.meta;

  const migrated = await migrateLegacyKey(userId);
  return migrated.meta;
}

export async function clearApiKey(userId: string): Promise<void> {
  if (!userId) return;
  const { key: keyId, meta: metaId } = storageKeys(userId);
  await deletePair(keyId, metaId);
}

export function maskKey(key: string): string {
  if (key.length < 12) return '••••••••';
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}
