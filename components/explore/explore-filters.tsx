import { useEffect } from 'react';
import { View } from 'react-native';

import { ExplorePicker } from '@/components/explore/explore-picker';
import { AppText } from '@/components/ui/app-text';
import {
  allowedRollupsForTimeframe,
  coerceRollupForTimeframe,
  needsAnalyticsApi,
} from '@/lib/analytics/analytics-query';
import {
  EXPLORE_GROUPS,
  EXPLORE_METRICS,
  EXPLORE_ROLLUPS,
  type ExploreChartType,
  type ExploreGroupBy,
  type ExploreMetric,
  type ExploreRollup,
} from '@/lib/analytics/explore';
import {
  TIMEFRAMES,
  getTimeframeDefinition,
  type TimeframeId,
} from '@/lib/analytics/timeframe';

const CHART_TYPES: { id: ExploreChartType; label: string; shortLabel: string }[] = [
  { id: 'line', label: 'Line', shortLabel: 'Line' },
  { id: 'bar', label: 'Stacked bar', shortLabel: 'Stack' },
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
  const allowedRollups = allowedRollupsForTimeframe(timeframe);

  useEffect(() => {
    const next = coerceRollupForTimeframe(timeframe, rollup);
    if (next !== rollup) onRollupChange(next);
  }, [timeframe, rollup, onRollupChange]);

  const handleTimeframeChange = (id: TimeframeId) => {
    onTimeframeChange(id);
    const next = coerceRollupForTimeframe(id, rollup);
    if (next !== rollup) onRollupChange(next);
  };

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <ExplorePicker
          flex
          dense
          label="Range"
          options={TIMEFRAMES.map((t) => ({
            id: t.id,
            label: t.label,
            shortLabel: t.short,
          }))}
          value={timeframe}
          onChange={(id) => handleTimeframeChange(id as TimeframeId)}
        />
        <ExplorePicker
          flex
          dense
          label="Metric"
          options={EXPLORE_METRICS.map((m) => ({
            id: m.id,
            label: m.label,
            shortLabel: m.short,
          }))}
          value={metric}
          onChange={(id) => onMetricChange(id as ExploreMetric)}
        />
        <ExplorePicker
          flex
          dense
          label="Group"
          options={EXPLORE_GROUPS.map((g) => ({
            id: g.id,
            label: g.label,
            shortLabel: g.id === 'provider' ? 'Prov' : 'Model',
          }))}
          value={groupBy}
          onChange={(id) => onGroupByChange(id as ExploreGroupBy)}
        />
        <ExplorePicker
          flex
          dense
          label="Rollup"
          options={EXPLORE_ROLLUPS.filter((r) => allowedRollups.includes(r.id)).map(
            (r) => ({
              id: r.id,
              label: r.label,
              shortLabel: r.short,
            })
          )}
          value={rollup}
          onChange={(id) => onRollupChange(id as ExploreRollup)}
        />
        <ExplorePicker
          flex
          dense
          label="Chart"
          options={CHART_TYPES.map((c) => ({
            id: c.id,
            label: c.label,
            shortLabel: c.shortLabel,
          }))}
          value={chartType}
          onChange={(id) => onChartTypeChange(id as ExploreChartType)}
        />
      </View>
      <AppText variant="caption" numberOfLines={2} style={{ fontSize: 11 }}>
        {needsAnalyticsApi(rollup)
          ? timeframe === 'today' && rollup === 'minute'
            ? `${def.windowDescription} · minute (≤3h API cap)`
            : `${def.windowDescription} · ${rollup} buckets · Analytics`
          : `${def.windowDescription}${timeframe === 'today' ? ' · live /key spend' : ''}`}
      </AppText>
    </View>
  );
}
