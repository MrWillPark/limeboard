import Constants from 'expo-constants';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

const PRIVATE_IP =
  /exp:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.|0\.0\.0\.0|localhost)/i;

/**
 * Redirect URI for OAuth.
 *
 * Expo Go on LAN produces exp://192.168.x.x:… which Supabase Auth blocks
 * (IP address filter). Use `npx expo start --tunnel` so the URL is
 * exp://….exp.direct / u.expo.dev without a private IP, OR use a
 * development build with scheme limeboard://.
 */
export function getOAuthRedirectUri() {
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('auth/callback');
  }
  return makeRedirectUri({
    scheme: 'limeboard',
    path: 'auth/callback',
  });
}

export function getOAuthRedirectBlockReason(redirectTo = getOAuthRedirectUri()): string | null {
  if (PRIVATE_IP.test(redirectTo)) {
    return (
      'Google sign-in cannot return to Expo Go over LAN — Supabase blocks ' +
      'exp:// URLs that contain a private IP.\n\n' +
      'Fix: stop Metro, run `npx expo start --tunnel`, reload the app, then ' +
      'add the new redirect URL shown below to Supabase → Auth → Redirect URLs.'
    );
  }
  return null;
}

function oauthErrorMessage(params: Record<string, string | undefined>) {
  const description = params.error_description ?? params.error ?? params.errorCode;
  if (!description) return null;
  return decodeURIComponent(description.replace(/\+/g, ' '));
}

export async function createSessionFromUrl(url: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  const { params, errorCode } = QueryParams.getQueryParams(url);
  const oauthError = oauthErrorMessage({ ...params, errorCode: errorCode ?? undefined });
  if (oauthError) throw new Error(oauthError);

  if (params.access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token ?? '',
    });
    if (error) throw error;
    return data.session;
  }

  if (params.code) {
    const flowId = params.sb_flow_id;
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      params.code,
      flowId ? { flowId } : undefined
    );
    if (error) throw error;
    return data.session;
  }

  throw new Error('OAuth callback missing access_token or code');
}

export async function signInWithOAuthProvider(provider: 'google' | 'apple') {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');

  const redirectTo = getOAuthRedirectUri();
  const blockReason = getOAuthRedirectBlockReason(redirectTo);
  if (blockReason) {
    throw new Error(`${blockReason}\n\nCurrent redirect:\n${redirectTo}`);
  }

  if (__DEV__) {
    console.log('[oauth] redirectTo =', redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('OAuth URL missing from Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (__DEV__) {
    console.log(
      '[oauth] browser result =',
      result.type,
      result.type === 'success' ? result.url : ''
    );
  }

  if (result.type === 'success') {
    return createSessionFromUrl(result.url);
  }

  if (result.type === 'dismiss') {
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) return sessionData.session;
    }
    throw new Error(
      `Google sign-in closed without a session. Add this exact URL in Supabase → Auth → Redirect URLs:\n${redirectTo}`
    );
  }

  if (result.type === 'cancel') {
    throw new Error('Sign in was cancelled');
  }

  throw new Error(
    `Sign in did not complete (${result.type}). Add this redirect URL in Supabase:\n${redirectTo}`
  );
}
