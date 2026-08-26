import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { getTimeframeDefinition, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  timeframe: TimeframeId;
  dataSource?: 'activity' | 'live_key' | 'fleet_keys';
  /** Single-line caption for dense filter bars */
  compact?: boolean;
};

export function TimeframeCaption({ timeframe, dataSource, compact }: Props) {
  const def = getTimeframeDefinition(timeframe);
  const keyNote =
    dataSource === 'fleet_keys'
      ? timeframe === '7d'
        ? 'Spend · Σ keys usage_weekly (matches Keys)'
        : timeframe === '30d'
          ? 'Spend · Σ keys usage_monthly (matches Keys)'
          : 'Spend · Σ keys usage_daily (matches Keys)'
      : dataSource === 'live_key'
        ? 'Spend · live /key'
        : null;

  if (compact) {
    return (
      <View style={{ gap: 2 }}>
        <AppText variant="caption">{def.windowDescription}</AppText>
        {keyNote ? (
          <AppText variant="caption" color={colors.limeSoft}>
            {keyNote}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        gap: 4,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgElevated,
      }}
    >
      <AppText variant="caption">{def.windowDescription}</AppText>
      <AppText variant="caption">{def.dataNote}</AppText>
      {keyNote ? (
        <AppText variant="caption" color={colors.limeSoft}>
          {keyNote}
        </AppText>
      ) : null}
    </View>
  );
}
