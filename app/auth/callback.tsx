import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';

/** OAuth return target — session is completed in SessionProvider deep-link handler. */
export default function AuthCallbackScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.xl,
        }}
      >
        <ActivityIndicator color={colors.limeSoft} />
        <AppText variant="caption" color={colors.textSecondary}>
          Finishing sign in…
        </AppText>
      </View>
    </>
  );
}
