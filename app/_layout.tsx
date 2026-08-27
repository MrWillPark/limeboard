import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthGate } from '@/components/auth/auth-gate';
import { LimeBoardDarkTheme, colors } from '@/constants/theme';
import { AppProviders } from '@/providers/app-providers';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden in Expo Go
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (error) {
      console.warn('Font load failed; continuing with system fonts', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AppProviders>
      <ThemeProvider value={LimeBoardDarkTheme}>
        <AuthGate>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: loaded ? 'DMSans_600SemiBold' : undefined },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="connect"
              options={{
                presentation: 'modal',
                title: 'Connect key',
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'modal',
                title: 'LimeBoard Pro',
              }}
            />
            <Stack.Screen
              name="privacy"
              options={{
                presentation: 'modal',
                title: 'Privacy Policy',
              }}
            />
            <Stack.Screen
              name="terms"
              options={{
                presentation: 'modal',
                title: 'Terms of Use',
              }}
            />
          </Stack>
        </AuthGate>
      </ThemeProvider>
    </AppProviders>
  );
}
