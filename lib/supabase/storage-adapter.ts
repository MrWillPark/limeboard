import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number) {
  return `sb_${key}_${index}`;
}

export const supabaseStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (process.env.EXPO_OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    if (!(await SecureStore.isAvailableAsync())) return null;

    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!countRaw) {
      return SecureStore.getItemAsync(key);
    }

    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) return null;

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (process.env.EXPO_OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    if (!(await SecureStore.isAvailableAsync())) return;

    await SecureStore.deleteItemAsync(key);
    const oldCount = await SecureStore.getItemAsync(`${key}_chunks`);
    if (oldCount) {
      const n = Number(oldCount);
      for (let i = 0; i < n; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    }

    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
      );
    }
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunks), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  removeItem: async (key: string): Promise<void> => {
    if (process.env.EXPO_OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    if (!(await SecureStore.isAvailableAsync())) return;

    await SecureStore.deleteItemAsync(key);
    const countRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (countRaw) {
      const count = Number(countRaw);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
  },
};
