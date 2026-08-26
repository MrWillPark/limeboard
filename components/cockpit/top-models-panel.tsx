import { View } from 'react-native';

import { HorizontalBarChart } from '@/components/charts/charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import { formatUsd, type ModelSpendRow } from '@/lib/analytics/burn';
import { shortModelName } from '@/lib/analytics/explore';
import { timeframeLabel, type TimeframeId } from '@/lib/analytics/timeframe';

type Props = {
  rows: ModelSpendRow[];
  timeframe: TimeframeId;
};

export function TopModelsPanel({ rows, timeframe }: Props) {
  const barRows = rows.slice(0, 5).map((row, i) => ({
    label: shortModelName(row.model),
    value: row.usage,
    share: row.share,
    color: colors.chart[i % colors.chart.length],
  }));

  return (
    <Panel style={{ gap: spacing.md }}>
      <AppText variant="title">Top models</AppText>
      <AppText variant="caption">
        {timeframeLabel(timeframe)} · by spend
      </AppText>
      {rows.length === 0 ? (
        <AppText variant="caption">No model activity in this window.</AppText>
      ) : (
        <HorizontalBarChart rows={barRows} formatValue={(n) => formatUsd(n)} maxRows={5} />
      )}
    </Panel>
  );
}
