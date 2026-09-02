import { View } from 'react-native';
import { router } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';

type Props = {
  title: string;
  description: string;
  compact?: boolean;
};

export function UpgradePanel({ title, description, compact }: Props) {
  return (
    <Panel
      style={{
        gap: spacing.sm,
        borderColor: colors.limeDim,
        backgroundColor: colors.panel,
      }}
    >
      <View style={{ gap: 4 }}>
        <AppText variant="label" color={colors.limeSoft}>
          Burnline Pro
        </AppText>
        <AppText variant="title">{title}</AppText>
        {!compact ? <AppText>{description}</AppText> : null}
      </View>
      <AppButton title="Upgrade" onPress={() => router.push('/paywall')} />
    </Panel>
  );
}

export function ManagementKeyHint({ feature }: { feature: string }) {
  return (
    <Panel style={{ gap: spacing.sm }}>
      <AppText variant="label" color={colors.amber}>
        Management key suggested
      </AppText>
      <AppText>
        {feature} Pro unlocks the UI — connect a Management API key for the richest
        OpenRouter data (activity history, fleet keys, minute rollups).
      </AppText>
      <AppButton title="Connect key" variant="ghost" onPress={() => router.push('/connect')} />
    </Panel>
  );
}
