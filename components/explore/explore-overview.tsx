import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import type { OverviewTotals } from '@/lib/analytics/explore';
import { formatTokens, formatUsd } from '@/lib/analytics/burn';

import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  totals: OverviewTotals;
  timeframe: TimeframeId;
  liveSpend?: boolean;
};

export function ExploreOverview({ totals, timeframe, liveSpend }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label">Overview · {timeframeLabel(timeframe)}</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <OverviewCard
          label="Spend"
          value={formatUsd(totals.spend)}
          accent
          hint={liveSpend ? 'Live · /key' : undefined}
        />
        <OverviewCard label="Requests" value={formatTokens(totals.requests)} />
        <OverviewCard
          label="Tokens"
          value={formatTokens(totals.promptTokens + totals.completionTokens)}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <OverviewCard label="Prompt" value={formatTokens(totals.promptTokens)} compact />
        <OverviewCard label="Completion" value={formatTokens(totals.completionTokens)} compact />
        <OverviewCard label="Reasoning" value={formatTokens(totals.reasoningTokens)} compact />
      </View>
      {totals.byokSpend > 0 ? (
        <Panel style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
          <AppText variant="caption">
            BYOK inference est. {formatUsd(totals.byokSpend)} · credits above are OpenRouter spend
          </AppText>
        </Panel>
      ) : null}
    </View>
  );
}

function OverviewCard({
  label,
  value,
  accent,
  compact,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  compact?: boolean;
  hint?: string;
}) {
  return (
    <Panel
      accent={accent}
      style={{
        flex: 1,
        gap: 4,
        padding: compact ? spacing.sm : spacing.md,
      }}
    >
      <AppText variant="label">{label}</AppText>
      <AppText
        variant={compact ? 'mono' : 'monoLg'}
        selectable
        style={compact ? { fontSize: 15 } : undefined}
        color={accent ? colors.lime : colors.text}
      >
        {value}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </Panel>
  );
}
