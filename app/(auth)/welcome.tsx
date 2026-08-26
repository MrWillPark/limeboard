import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/config/env';
import { useSession } from '@/providers/session-provider';

export default function WelcomeScreen() {
  const { signInWithApple } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onApple = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
          <AppText variant="title">LimeBoard</AppText>
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
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.xl,
        flexGrow: 1,
        justifyContent: 'center',
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.limeSoft}>
          OpenRouter analytics
        </AppText>
        <AppText style={{ fontSize: 34, fontFamily: 'DMSans_700Bold', color: colors.text }}>
          LimeBoard
        </AppText>
        <AppText>
          Track balance, burn rate, and model spend. Sign in to sync your subscription
          and access platform-wide rankings — even before you connect a key.
        </AppText>
      </View>

      <Panel style={{ gap: spacing.md }}>
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={{ width: '100%', height: 48 }}
            onPress={() => void onApple()}
          />
        ) : null}

        <AppButton
          title={Platform.OS === 'ios' ? 'Continue with email' : 'Sign in with email'}
          variant={Platform.OS === 'ios' ? 'ghost' : 'primary'}
          disabled={loading}
          onPress={() => router.push('/(auth)/sign-in')}
        />

        {error ? (
          <AppText color={colors.red} selectable>
            {error}
          </AppText>
        ) : null}
      </Panel>

      <AppText variant="caption" color={colors.textMuted}>
        By continuing you agree to our Terms and Privacy Policy. OpenRouter API keys stay
        on your device except for direct calls to OpenRouter.
      </AppText>
    </ScrollView>
  );
}
