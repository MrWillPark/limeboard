import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { useScreenshotPreviewOptional } from '@/providers/screenshot-preview-provider';

const MODE_LABEL: Record<string, string> = {
  'no-key': 'No key',
  'no-pro': 'No Pro',
};

export function ScreenshotPreviewBanner() {
  const preview = useScreenshotPreviewOptional();
  if (!preview?.isPreviewActive) return null;

  const label = MODE_LABEL[preview.mode] ?? preview.mode;

  return (
    <View
      style={{
        backgroundColor: colors.amberDim,
        borderBottomWidth: 1,
        borderBottomColor: colors.amber,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <AppText variant="caption" color={colors.amber} style={{ flex: 1 }}>
        Screenshot preview · {label}
      </AppText>
      <Pressable
        onPress={() => preview.setMode('live')}
        hitSlop={8}
        style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.amber,
        }}
      >
        <AppText variant="label" color={colors.amber}>
          Exit → Live
        </AppText>
      </Pressable>
      <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
        <AppText variant="label" color={colors.limeSoft}>
          Settings
        </AppText>
      </Pressable>
    </View>
  );
}
