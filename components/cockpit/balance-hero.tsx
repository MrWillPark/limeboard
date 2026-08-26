import { View } from 'react-native';

import { Sparkline } from '@/components/charts/charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  formatShortDate,
  formatUsd,
  type BurnSnapshot,
} from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  burn: BurnSnapshot;
  series: number[];
  timeframe: TimeframeId;
  keyLabel?: string | null;
  isManagementKey?: boolean;
};

export function BalanceHero({
  burn,
  series,
  timeframe,
  keyLabel,
  isManagementKey,
}: Props) {
  return (
    <Panel accent style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ gap: 4, flex: 1 }}>
          <AppText variant="label" color={colors.limeSoft}>
            Account balance
          </AppText>
          <AppText variant="monoLg" selectable>
            {formatUsd(burn.accountBalance)}
          </AppText>
          <AppText variant="caption">
            From /credits · loaded {formatUsd(burn.totalCredits)} · spent{' '}
            {formatUsd(burn.lifetimeUsage)} lifetime
          </AppText>
        </View>
        <Sparkline values={series.length >= 2 ? series : [0, 0]} width={120} height={44} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Metric
          label={`Spend · ${timeframeLabel(timeframe)}`}
          value={formatUsd(burn.periodSpend)}
          hint={
            burn.periodDataSource === 'fleet_keys'
              ? timeframe === '7d'
                ? 'Σ keys · week'
                : timeframe === '30d'
                  ? 'Σ keys · month'
                  : 'Σ keys · today'
              : burn.periodDataSource === 'live_key'
                ? 'Live · /key'
                : 'Activity aggregate'
          }
        />
        <Metric
          label={timeframe === 'today' ? 'Pace / day' : 'Avg / day'}
          value={formatUsd(burn.avgDailySpend)}
          hint={timeframe === 'today' ? 'Spend so far today' : undefined}
        />
        <Metric
          label="Requests"
          value={
            burn.periodRequests > 0 ? String(burn.periodRequests) : '—'
          }
          hint={
            timeframe === 'today' && burn.periodRequests === 0
              ? 'Updates after day closes'
              : undefined
          }
        />
      </View>

      <View style={{ gap: 4 }}>
        <AppText variant="caption">
          Runway · {burn.runwayLabel}
          {burn.projectedZeroDate
            ? ` · est. empty ${formatShortDate(burn.projectedZeroDate)}`
            : ''}
        </AppText>
        {keyLabel ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Session · {isManagementKey ? 'management key' : 'API key'} · {keyLabel}
          </AppText>
        ) : null}
      </View>
    </Panel>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="mono" selectable style={{ fontSize: 15 }}>
        {value}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}
