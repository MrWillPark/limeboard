import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

/** Deep-link URI registered in Supabase → Auth → URL configuration. */
export function getOAuthRedirectUri() {
  return makeRedirectUri({
    scheme: 'limeboard',
    path: 'auth/callback',
  });
}

export async function createSessionFromUrl(url: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (!access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
}

export async function signInWithOAuthProvider(provider: 'google' | 'apple') {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  const redirectTo = getOAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('OAuth URL missing from Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type !== 'success') {
    throw new Error('Sign in was cancelled');
  }

  return createSessionFromUrl(result.url);
}
