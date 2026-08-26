import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { getTimeframeDefinition, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  timeframe: TimeframeId;
  dataSource?: 'activity' | 'live_key';
  /** Single-line caption for dense filter bars */
  compact?: boolean;
};

export function TimeframeCaption({ timeframe, dataSource, compact }: Props) {
  const def = getTimeframeDefinition(timeframe);

  if (compact) {
    return (
      <View style={{ gap: 2 }}>
        <AppText variant="caption">{def.windowDescription}</AppText>
        {dataSource === 'live_key' ? (
          <AppText variant="caption" color={colors.limeSoft}>
            Spend · live /key (UTC day)
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
      {dataSource === 'live_key' ? (
        <AppText variant="caption" color={colors.limeSoft}>
          Spend · live from /key usage_daily (OpenRouter’s current UTC day counter)
        </AppText>
      ) : null}
    </View>
  );
}
