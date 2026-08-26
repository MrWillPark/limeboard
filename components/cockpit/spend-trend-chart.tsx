import { View } from 'react-native';

import { LineChart } from '@/components/charts/charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { formatChartDate, formatUsd } from '@/lib/analytics/burn';
import { getTimeframeDefinition, timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  series: { date: string; value: number }[];
  timeframe: TimeframeId;
  total: number;
  dataSource?: 'activity' | 'live_key';
};

export function SpendTrendChart({ series, timeframe, total, dataSource }: Props) {
  const def = getTimeframeDefinition(timeframe);
  const sourceLabel =
    dataSource === 'live_key'
      ? 'live /key spend on latest point · prior days from activity'
      : 'account-wide from activity';

  return (
    <Panel style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="title">Spend trend</AppText>
        <AppText variant="mono" selectable color={colors.lime}>
          {formatUsd(total)}
        </AppText>
      </View>
      <AppText variant="caption">
        {timeframeLabel(timeframe)} · {sourceLabel}
      </AppText>
      {timeframe === 'today' ? (
        <AppText variant="caption">{def.dataNote}</AppText>
      ) : null}
      <LineChart
        values={series.map((p) => p.value)}
        labels={series.map((p) => formatChartDate(p.date))}
        height={140}
      />
    </Panel>
  );
}
