import { View } from 'react-native';

import { LineChart } from '@/components/charts/charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { formatChartDate, formatUsd } from '@/lib/analytics/burn';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type Point = { date: string; value: number; label?: string };

type Props = {
  series: Point[];
  timeframe: TimeframeId;
  total: number;
  dataSource?: 'activity' | 'live_key';
};

export function SpendTrendChart({ series, timeframe, total, dataSource }: Props) {
  const sourceLabel =
    timeframe === 'today' || dataSource === 'live_key'
      ? 'live /key · midnight → now (device local)'
      : 'account-wide from activity';

  const labels = series.map((p) => p.label ?? formatChartDate(p.date));

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
      <LineChart values={series.map((p) => p.value)} labels={labels} height={140} />
    </Panel>
  );
}
