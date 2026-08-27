import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

/** Lock Desk Monitor to landscape on native; web uses Screen Orientation API when available. */
export function useDeskLandscapeLock() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof screen !== 'undefined' && screen.orientation?.lock) {
        void screen.orientation.lock('landscape').catch(() => {});
        return () => {
          try {
            screen.orientation.unlock();
          } catch {
            /* ignore */
          }
        };
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        if (!cancelled) console.warn('Desk Monitor landscape lock failed', e);
      }
    })();

    return () => {
      cancelled = true;
      void ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);
}
