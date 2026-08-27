import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';

/**
 * Supabase PKCE needs crypto.subtle.digest('SHA-256'). Hermes/Expo Go
 * don't expose SubtleCrypto, which causes "use plain instead of sha256"
 * and broken OAuth code exchange.
 */
export function polyfillWebCrypto() {
  const g = globalThis as typeof globalThis & {
    crypto?: any;
    btoa?: (data: string) => string;
  };

  if (typeof g.btoa !== 'function') {
    g.btoa = (data: string) => {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = data;
      let output = '';
      for (
        let block = 0, charCode = 0, i = 0, map = chars;
        str.charAt(i | 0) || ((map = '='), i % 1);
        output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
      ) {
        charCode = str.charCodeAt((i += 3 / 4));
        if (charCode > 0xff) {
          throw new Error('btoa failed: found non-Latin1 character');
        }
        block = (block << 8) | charCode;
      }
      return output;
    };
  }

  const existing = g.crypto as
    | { getRandomValues?: Function; subtle?: { digest?: Function } }
    | undefined;

  if (typeof existing?.subtle?.digest === 'function' && typeof existing?.getRandomValues === 'function') {
    return;
  }

  const digest = async (
    algorithm: AlgorithmIdentifier,
    data: BufferSource
  ): Promise<ArrayBuffer> => {
    const name =
      typeof algorithm === 'string'
        ? algorithm
        : (algorithm as { name: string }).name;
    if (name.toUpperCase() !== 'SHA-256') {
      throw new Error(`Unsupported digest algorithm: ${name}`);
    }
    const view =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const bytes = Uint8Array.from(view);
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, bytes);
  };

  const getRandomValues =
    typeof existing?.getRandomValues === 'function'
      ? existing.getRandomValues.bind(existing)
      : (array: ArrayBufferView) => {
          const fallback = (globalThis as any).crypto?.getRandomValues;
          if (typeof fallback !== 'function') {
            throw new Error('crypto.getRandomValues is unavailable');
          }
          return fallback(array);
        };

  const cryptoObj = {
    getRandomValues,
    subtle: { digest },
  };

  try {
    Object.defineProperty(g, 'crypto', {
      configurable: true,
      enumerable: true,
      value: cryptoObj,
    });
  } catch {
    g.crypto = cryptoObj;
  }
}

polyfillWebCrypto();
