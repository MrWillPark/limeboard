import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';

import { getOAuthRedirectUri, signInWithOAuthProvider } from '@/lib/auth/oauth';
import { getSupabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config/env';
import { useOAuthDeepLinkHandler } from '@/hooks/use-oauth-deep-link';

type SessionState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  passwordRecovery: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useOAuthDeepLinkHandler();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithApple = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured');

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In did not return an identity token');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithOAuthProvider('google');
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getOAuthRedirectUri(),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPasswordRecovery(false);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    setPasswordRecovery(false);
    if (!supabase) {
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      passwordRecovery,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPasswordForEmail,
      updatePassword,
      clearPasswordRecovery,
      signOut,
    }),
    [
      ready,
      session,
      passwordRecovery,
      signInWithApple,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPasswordForEmail,
      updatePassword,
      clearPasswordRecovery,
      signOut,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export function useRequireSession(): SessionState & { session: Session; user: User } {
  const state = useSession();
  if (!state.ready) {
    throw new Error('Session not ready');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  if (!state.session || !state.user) {
    throw new Error('No active session');
  }
  return state as SessionState & { session: Session; user: User };
}
