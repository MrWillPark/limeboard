import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/theme';
import { TIMEFRAMES, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  value: TimeframeId;
  onChange: (id: TimeframeId) => void;
  /** Compact segmented row without a label (for filter bars) */
  compact?: boolean;
  /** When set, only these timeframes are selectable; others render as Pro upsell chips. */
  allowed?: TimeframeId[];
};

export function TimeframePicker({ value, onChange, compact, allowed }: Props) {
  const showLockedUpsell =
    allowed != null && TIMEFRAMES.some((opt) => !allowed.includes(opt.id));

  const openPaywall = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    router.push('/paywall');
  };

  return (
    <View style={{ gap: compact ? 4 : spacing.sm }}>
      {!compact ? <AppText variant="label">Timeframe</AppText> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {TIMEFRAMES.map((opt) => {
          const locked = showLockedUpsell && !allowed!.includes(opt.id);
          const active = !locked && opt.id === value;

          if (locked) {
            return (
              <Pressable
                key={opt.id}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label}, Burnline Pro`}
                onPress={openPaywall}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: compact ? 10 : spacing.sm,
                  borderRadius: compact ? radii.sm : radii.pill,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: colors.limeDim,
                  borderStyle: 'dashed',
                  backgroundColor: colors.bgElevated,
                  minHeight: compact ? 34 : undefined,
                }}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    color: colors.textMuted,
                  }}
                >
                  {compact ? opt.short : opt.label}
                </AppText>
                <Ionicons name="lock-closed" size={11} color={colors.limeSoft} />
              </Pressable>
            );
          }

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
                  color: active ? colors.limeSoft : colors.textSecondary,
                }}
              >
                {compact ? opt.short : opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {showLockedUpsell ? (
        <AppText variant="caption" color={colors.textMuted}>
          {compact
            ? 'Pro unlocks 3H intraday and 30-day windows.'
            : 'Upgrade to Pro for 3-hour intraday and 30-day history.'}
        </AppText>
      ) : null}
    </View>
  );
}
