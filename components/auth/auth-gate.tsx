import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/constants/theme';
import { LEGAL } from '@/lib/config/legal';
import { isSupabaseConfigured } from '@/lib/config/env';
import { useSession } from '@/providers/session-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOAuthCallback = segments[0] === 'auth' && segments[1] === 'callback';

    if (!isSupabaseConfigured()) {
      if (__DEV__ && inAuthGroup) {
        router.replace('/(tabs)');
      }
      return;
    }

    if (!session && !inAuthGroup && !inOAuthCallback) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, session, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.limeSoft} />
      </View>
    );
  }

  if (!isSupabaseConfigured() && !__DEV__) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <AppText variant="title" style={{ textAlign: 'center', marginBottom: 12 }}>
          Sign-in unavailable
        </AppText>
        <AppText color={colors.textMuted} style={{ textAlign: 'center' }}>
          This build is missing server configuration. Contact {LEGAL.supportEmail} if this
          persists.
        </AppText>
      </View>
    );
  }

  return <>{children}</>;
}

export function AuthStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
