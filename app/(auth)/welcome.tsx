import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { isAppleSignInAvailable } from '@/lib/auth/apple';
import {
  getOAuthRedirectBlockReason,
  getOAuthRedirectUri,
} from '@/lib/auth/oauth';
import { isSupabaseConfigured } from '@/lib/config/env';
import { useSession } from '@/providers/session-provider';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithApple, signInWithGoogle } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const redirectUri = getOAuthRedirectUri();
  const googleBlockedReason = getOAuthRedirectBlockReason(redirectUri);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const onApple = async () => {
    setError(null);
    setLoading('apple');
    try {
      await signInWithApple();
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(null);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setLoading('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      if (e instanceof Error && e.message.includes('cancelled')) return;
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(null);
    }
  };

  if (!isSupabaseConfigured()) {
    if (!__DEV__) {
      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={{
            paddingTop: insets.top + spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            flexGrow: 1,
            justifyContent: 'center',
            gap: spacing.lg,
          }}
        >
          <AppText variant="title">Sign-in unavailable</AppText>
          <AppText color={colors.textMuted}>
            This build is missing server configuration. Contact support if this persists.
          </AppText>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.lg,
          flexGrow: 1,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
          <AppText variant="display">Burnline</AppText>
          <AppText>
            Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY to enable the login gate.
          </AppText>
          <AppButton title="Continue without auth (dev)" onPress={() => router.replace('/(tabs)')} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.xl,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.limeSoft}>
          LLM spend cockpit
        </AppText>
        <AppText variant="display">Burnline</AppText>
        <AppText>
          Know your burn. Know your runway. Sign in to sync your subscription and
          browse platform rankings — even before you connect a key. OpenRouter today.
        </AppText>
      </View>

      <Panel style={{ gap: spacing.md }}>
        {appleAvailable ? (
          <>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={{ width: '100%', height: 48, opacity: loading === 'apple' ? 0.6 : 1 }}
              onPress={() => void onApple()}
            />
            <AppText variant="caption" color={colors.textSecondary}>
              Choose &quot;Share My Email&quot; to link an existing Burnline account. Hide My
              Email creates a separate account.
            </AppText>
          </>
        ) : Platform.OS === 'ios' ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Sign in with Apple requires a dev build (not supported in Expo Go). Use Google or
            email below.
          </AppText>
        ) : null}

        {loading === 'google' ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs }}>
            <ActivityIndicator color={colors.limeSoft} />
            <AppText variant="caption" color={colors.textSecondary}>
              Completing Google sign in…
            </AppText>
          </View>
        ) : (
          <AppButton
            title="Continue with Google"
            variant={appleAvailable ? 'ghost' : 'primary'}
            disabled={loading !== null || Boolean(googleBlockedReason)}
            onPress={() => void onGoogle()}
          />
        )}

        <AppButton
          title="Continue with email"
          variant="ghost"
          disabled={loading !== null}
          onPress={() => router.push('/(auth)/sign-in')}
        />

        {googleBlockedReason ? (
          <AppText color={colors.amber} selectable>
            {googleBlockedReason}
          </AppText>
        ) : null}

        {error ? (
          <AppText color={colors.red} selectable>
            {error}
          </AppText>
        ) : null}
      </Panel>

      {__DEV__ ? (
        <AppText variant="caption" color={colors.textMuted} selectable>
          Add to Supabase → Auth → Redirect URLs:{'\n'}
          {redirectUri}
        </AppText>
      ) : null}

      <AppText variant="caption" color={colors.textMuted}>
        By continuing you agree to our{' '}
        <AppText
          variant="caption"
          color={colors.limeSoft}
          onPress={() => router.push('/terms')}
        >
          Terms
        </AppText>{' '}
        and{' '}
        <AppText
          variant="caption"
          color={colors.limeSoft}
          onPress={() => router.push('/privacy')}
        >
          Privacy Policy
        </AppText>
        . OpenRouter API keys stay on your device except for direct calls to OpenRouter.
      </AppText>
    </ScrollView>
  );
}
