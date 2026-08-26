import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, fonts, spacing } from '@/constants/theme';
import type { OverviewTotals } from '@/lib/analytics/explore';
import { formatTokens, formatUsd } from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  totals: OverviewTotals;
  timeframe: TimeframeId;
  liveSpend?: boolean;
  analytics?: boolean;
};

export function ExploreOverview({ totals, timeframe, liveSpend, analytics }: Props) {
  const totalTokens = totals.promptTokens + totals.completionTokens;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">Overview · {timeframeLabel(timeframe)}</AppText>
        {liveSpend ? (
          <AppText variant="caption" color={colors.limeSoft}>
            Live · /key
          </AppText>
        ) : analytics ? (
          <AppText variant="caption" color={colors.limeSoft}>
            Analytics · matches chart
          </AppText>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderRadius: 12,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.panel,
          overflow: 'hidden',
        }}
      >
        <Kpi
          label="Spend"
          value={formatUsd(totals.spend)}
          accent
          border
        />
        <Kpi label="Requests" value={formatTokens(totals.requests)} border />
        <Kpi label="Tokens" value={formatTokens(totalTokens)} />
      </View>

      <AppText variant="caption" numberOfLines={1}>
        In {formatTokens(totals.promptTokens)} · out {formatTokens(totals.completionTokens)}
        {totals.reasoningTokens > 0
          ? ` · reason ${formatTokens(totals.reasoningTokens)}`
          : ''}
        {totals.byokSpend > 0 ? ` · BYOK ${formatUsd(totals.byokSpend)}` : ''}
      </AppText>
    </View>
  );
}

function Kpi({
  label,
  value,
  accent,
  border,
}: {
  label: string;
  value: string;
  accent?: boolean;
  border?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        gap: 2,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRightWidth: border ? 1 : 0,
        borderRightColor: colors.border,
        backgroundColor: accent ? colors.limeDim : undefined,
      }}
    >
      <AppText variant="label" style={{ fontSize: 10, letterSpacing: 0.6 }}>
        {label}
      </AppText>
      <AppText
        variant="mono"
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        color={accent ? colors.lime : colors.text}
        style={{ fontSize: 15, fontFamily: fonts.monoMedium, letterSpacing: -0.3 }}
      >
        {value}
      </AppText>
    </View>
  );
}
