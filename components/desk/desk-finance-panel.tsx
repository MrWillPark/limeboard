import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import { formatShortDate, formatUsd, type BurnSnapshot } from '@/lib/analytics/burn';

const ACCENT = {
  cyan: '#22D3EE',
  amber: colors.amber,
} as const;

type Props = {
  burn: BurnSnapshot;
};

export function DeskFinancePanel({ burn }: Props) {
  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgElevated,
      }}
    >
      <FinanceRow label="Balance" value={formatUsd(burn.accountBalance)} color={colors.lime} large />
      <FinanceRow label="Spend · today" value={formatUsd(burn.periodSpend)} color={ACCENT.cyan} />
      <FinanceRow label="Pace / day" value={formatUsd(burn.avgDailySpend)} color={ACCENT.amber} />
      <FinanceRow label="Runway" value={burn.runwayLabel} compact />
      {burn.projectedZeroDate ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          Est. empty {formatShortDate(burn.projectedZeroDate)}
        </AppText>
      ) : null}
    </View>
  );
}

function FinanceRow({
  label,
  value,
  color = colors.text,
  large,
  compact,
}: {
  label: string;
  value: string;
  color?: string;
  large?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: large ? 36 : 28 }}>
      <AppText variant="label" style={{ fontSize: 10, width: 96, flexShrink: 0 }}>
        {label}
      </AppText>
      <AppText
        variant="mono"
        selectable
        color={color}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={compact ? 0.65 : 0.75}
        style={{
          flex: 1,
          textAlign: 'right',
          fontSize: large ? 24 : compact ? 14 : 17,
          lineHeight: large ? 28 : compact ? 18 : 22,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}
