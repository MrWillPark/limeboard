import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';

import { createSessionFromUrl } from '@/lib/auth/oauth';
import { isSupabaseConfigured } from '@/lib/config/env';

/** Completes OAuth when the app opens via auth callback deep link. */
export function useOAuthDeepLinkHandler() {
  const handling = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const handle = async (url: string) => {
      if (handling.current) return;
      if (!url.includes('access_token') && !url.includes('code=')) return;

      handling.current = true;
      try {
        await createSessionFromUrl(url);
      } catch (e) {
        console.warn('OAuth callback failed', e);
      } finally {
        handling.current = false;
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handle(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void handle(url);
    });

    return () => sub.remove();
  }, []);
}
