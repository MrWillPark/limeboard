import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/theme';
import { TIMEFRAMES, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  value: TimeframeId;
  onChange: (id: TimeframeId) => void;
  /** Compact segmented row without a label (for filter bars) */
  compact?: boolean;
};

export function TimeframePicker({ value, onChange, compact }: Props) {
  return (
    <View style={{ gap: compact ? 4 : spacing.sm }}>
      {!compact ? <AppText variant="label">Timeframe</AppText> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {TIMEFRAMES.map((opt) => {
          const active = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') {
                  Haptics.selectionAsync();
                }
                onChange(opt.id);
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingHorizontal: spacing.sm,
                paddingVertical: compact ? 10 : spacing.sm,
                borderRadius: compact ? radii.sm : radii.pill,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: active ? colors.limeGlow : colors.borderStrong,
                backgroundColor: active ? colors.limeDim : colors.bgElevated,
                minHeight: compact ? 34 : undefined,
              }}
            >
              <AppText
                style={{
                  fontSize: 13,
                  color: active ? colors.lime : colors.textSecondary,
                }}
              >
                {compact ? opt.short : opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
