import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { createSessionFromUrl } from '@/lib/auth/oauth';
import { isSupabaseConfigured } from '@/lib/config/env';

/** Completes OAuth when the app is opened via limeboard://auth/callback#... */
export function useOAuthDeepLinkHandler() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const handle = (url: string) => {
      if (!url.includes('access_token') && !url.includes('code=')) return;
      void createSessionFromUrl(url).catch((e) => {
        console.warn('OAuth callback failed', e);
      });
    };

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    void Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });

    return () => sub.remove();
  }, []);
}
