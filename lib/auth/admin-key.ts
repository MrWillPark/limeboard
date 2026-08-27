import * as Crypto from 'expo-crypto';

/** SHA-256 of the owner admin OpenRouter key — never store the raw key in source. */
const ADMIN_KEY_SHA256 =
  '10aba936a6b2606a4da81e64715996af8af3442f6e9465ffe2cc9c31e5baa872';

export async function isAdminApiKey(apiKey: string): Promise<boolean> {
  const trimmed = apiKey.trim();
  if (!trimmed) return false;

  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, trimmed);
  return hash === ADMIN_KEY_SHA256;
}

export function enrichKeyMeta<T extends { isManagementKey: boolean; isAdminKey?: boolean }>(
  apiKey: string,
  meta: T,
  isAdmin: boolean
): T {
  if (!isAdmin) return meta;
  return {
    ...meta,
    isAdminKey: true,
    isManagementKey: true,
  };
}
