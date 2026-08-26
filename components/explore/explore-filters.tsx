import { View } from 'react-native';

import { ExplorePicker } from '@/components/explore/explore-picker';
import { TimeframePicker } from '@/components/shared/timeframe-picker';
import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/constants/theme';
import {
  EXPLORE_GROUPS,
  EXPLORE_METRICS,
  type ExploreChartType,
  type ExploreGroupBy,
  type ExploreMetric,
  type ExploreRollup,
} from '@/lib/analytics/explore';
import { getTimeframeDefinition, type TimeframeId } from '@/lib/analytics/timeframe';

const CHART_TYPES: { id: ExploreChartType; label: string }[] = [
  { id: 'line', label: 'Line' },
  { id: 'bar', label: 'Stacked' },
];

const ROLLUPS: { id: ExploreRollup; label: string }[] = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
];

type Props = {
  timeframe: TimeframeId;
  onTimeframeChange: (id: TimeframeId) => void;
  metric: ExploreMetric;
  onMetricChange: (id: ExploreMetric) => void;
  groupBy: ExploreGroupBy;
  onGroupByChange: (id: ExploreGroupBy) => void;
  rollup: ExploreRollup;
  onRollupChange: (id: ExploreRollup) => void;
  chartType: ExploreChartType;
  onChartTypeChange: (id: ExploreChartType) => void;
};

export function ExploreFilters({
  timeframe,
  onTimeframeChange,
  metric,
  onMetricChange,
  groupBy,
  onGroupByChange,
  rollup,
  onRollupChange,
  chartType,
  onChartTypeChange,
}: Props) {
  const def = getTimeframeDefinition(timeframe);

  return (
    <View
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.panel,
      }}
    >
      <TimeframePicker value={timeframe} onChange={onTimeframeChange} compact />
      <AppText variant="caption" numberOfLines={1}>
        {def.windowDescription}
        {timeframe === 'today' ? ' · live /key' : ''}
      </AppText>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ExplorePicker
          flex
          label="Metric"
          options={EXPLORE_METRICS.map((m) => ({ id: m.id, label: m.label }))}
          value={metric}
          onChange={(id) => onMetricChange(id as ExploreMetric)}
        />
        <ExplorePicker
          flex
          label="Group"
          options={EXPLORE_GROUPS.map((g) => ({ id: g.id, label: g.label }))}
          value={groupBy}
          onChange={(id) => onGroupByChange(id as ExploreGroupBy)}
        />
        <ExplorePicker
          flex
          label="Rollup"
          options={ROLLUPS.map((r) => ({ id: r.id, label: r.label }))}
          value={rollup}
          onChange={(id) => onRollupChange(id as ExploreRollup)}
        />
        <ExplorePicker
          flex
          label="Chart"
          options={CHART_TYPES.map((c) => ({ id: c.id, label: c.label }))}
          value={chartType}
          onChange={(id) => onChartTypeChange(id as ExploreChartType)}
        />
      </View>
    </View>
  );
}
