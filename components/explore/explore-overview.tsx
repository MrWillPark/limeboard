import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import type { OverviewTotals } from '@/lib/analytics/explore';
import { formatTokens, formatUsd } from '@/lib/analytics/burn';

type Props = {
  totals: OverviewTotals;
};

export function ExploreOverview({ totals }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label">Overview · last 30 days</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <OverviewCard label="Spend" value={formatUsd(totals.spend)} accent />
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
}: {
  label: string;
  value: string;
  accent?: boolean;
  compact?: boolean;
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
    </Panel>
  );
}
