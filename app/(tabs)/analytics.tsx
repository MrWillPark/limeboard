import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import {
  Donut,
  HorizontalBarChart,
  LineChart,
  StackedBarChart,
} from '@/components/charts/charts';
import { ExploreOverview } from '@/components/explore/explore-overview';
import { ExplorePicker } from '@/components/explore/explore-picker';
import { TimeframeCaption } from '@/components/shared/timeframe-caption';
import { TimeframePicker } from '@/components/shared/timeframe-picker';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
  EXPLORE_GROUPS,
  EXPLORE_METRICS,
  aggregateRanked,
  aggregateStackedTimeSeries,
  aggregateTimeSeries,
  computeOverview,
  formatBucketLabel,
  formatMetricValue,
  shortModelName,
  type ExploreChartType,
  type ExploreGroupBy,
  type ExploreMetric,
  type ExploreRollup,
} from '@/lib/analytics/explore';
import {
  filterActivityByTimeframe,
  computeLiveTodaySpend,
  timeframeLabel,
  type TimeframeId,
} from '@/lib/analytics/timeframe';
import { useActivity, useKeyInfo, useManagedKeys } from '@/hooks/use-openrouter';
import { useAuth } from '@/providers/auth-provider';

const CHART_TYPES: { id: ExploreChartType; label: string }[] = [
  { id: 'line', label: 'Line' },
  { id: 'bar', label: 'Stacked bar' },
];

const ROLLUPS: { id: ExploreRollup; label: string }[] = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
];

export default function ExploreScreen() {
  const { isConnected, meta } = useAuth();
  const activityQuery = useActivity();
  const keyQuery = useKeyInfo();
  const keysQuery = useManagedKeys();

  const [timeframe, setTimeframe] = useState<TimeframeId>('30d');
  const [metric, setMetric] = useState<ExploreMetric>('spend');
  const [groupBy, setGroupBy] = useState<ExploreGroupBy>('model');
  const [chartType, setChartType] = useState<ExploreChartType>('line');
  const [rollup, setRollup] = useState<ExploreRollup>('day');

  const activity = useMemo(
    () => filterActivityByTimeframe(activityQuery.data ?? [], timeframe),
    [activityQuery.data, timeframe]
  );

  const overview = useMemo(() => {
    const base = computeOverview(activity);
    if (timeframe !== 'today') return base;
    const live = computeLiveTodaySpend(
      keyQuery.data,
      keysQuery.data,
      Boolean(meta?.isManagementKey)
    );
    return { ...base, spend: live.spend };
  }, [activity, timeframe, keyQuery.data, keysQuery.data, meta?.isManagementKey]);
  const ranked = useMemo(
    () => aggregateRanked(activity, metric, groupBy),
    [activity, metric, groupBy]
  );
  const timeSeries = useMemo(
    () => aggregateTimeSeries(activity, metric, rollup),
    [activity, metric, rollup]
  );
  const stacked = useMemo(() => {
    const raw = aggregateStackedTimeSeries(activity, metric, groupBy, rollup, 5);
    return {
      ...raw,
      series: raw.series.map((s, i) => ({
        ...s,
        color:
          s.key === '__other__'
            ? colors.textMuted
            : colors.chart[i % colors.chart.length],
      })),
    };
  }, [activity, metric, groupBy, rollup]);

  const metricMeta = EXPLORE_METRICS.find((m) => m.id === metric)!;
  const formatValue = (n: number) => formatMetricValue(metric, n);

  const donutSlices = ranked.slice(0, 6).map((row, i) => ({
    value: row.value,
    color: colors.chart[i % colors.chart.length],
  }));

  const barRows = ranked.map((row, i) => ({
    label: groupBy === 'model' ? shortModelName(row.label) : row.label,
    value: row.value,
    share: row.share,
    color: colors.chart[i % colors.chart.length],
  }));

  const bucketLabels = timeSeries.map((p) => formatBucketLabel(p.bucket, rollup));

  if (!isConnected) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg }}
      >
        <Panel>
          <AppText>Connect an OpenRouter key on Cockpit to open Explore.</AppText>
        </Panel>
      </ScrollView>
    );
  }

  if (!meta?.isManagementKey) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg }}
      >
        <Panel style={{ gap: spacing.sm }}>
          <AppText variant="title">Management key required</AppText>
          <AppText>
            Explore mirrors OpenRouter Activity — metric, group-by, and time
            rollups from GET /api/v1/activity (management key).
          </AppText>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={activityQuery.isFetching}
          onRefresh={() => activityQuery.refetch()}
          tintColor={colors.lime}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <AppText variant="display">Explore</AppText>
        <AppText>
          Slice OpenRouter usage like the Activity explorer — pivot timeframe,
          metric, group-by, and rollup.
        </AppText>
      </View>

      {activityQuery.isLoading ? (
        <ActivityIndicator color={colors.lime} />
      ) : activityQuery.isError ? (
        <Panel>
          <AppText color={colors.red} selectable>
            {(activityQuery.error as Error).message}
          </AppText>
        </Panel>
      ) : activity.length === 0 && timeframe !== 'today' ? (
        <Panel>
          <AppText>No activity in {timeframeLabel(timeframe).toLowerCase()}.</AppText>
        </Panel>
      ) : (
        <>
          <ExploreOverview totals={overview} timeframe={timeframe} liveSpend={timeframe === 'today'} />

          <Panel style={{ gap: spacing.lg }}>
            <TimeframePicker value={timeframe} onChange={setTimeframe} />
            <TimeframeCaption
              timeframe={timeframe}
              dataSource={timeframe === 'today' ? 'live_key' : undefined}
            />
            <ExplorePicker
              label="Metric"
              options={EXPLORE_METRICS.map((m) => ({ id: m.id, label: m.label }))}
              value={metric}
              onChange={(id) => setMetric(id as ExploreMetric)}
            />
            <ExplorePicker
              label="Group by"
              options={EXPLORE_GROUPS.map((g) => ({ id: g.id, label: g.label }))}
              value={groupBy}
              onChange={(id) => setGroupBy(id as ExploreGroupBy)}
            />
            <ExplorePicker
              label="Rollup"
              options={ROLLUPS.map((r) => ({ id: r.id, label: r.label }))}
              value={rollup}
              onChange={(id) => setRollup(id as ExploreRollup)}
            />
            <ExplorePicker
              label="Chart"
              options={CHART_TYPES.map((c) => ({ id: c.id, label: c.label }))}
              value={chartType}
              onChange={(id) => setChartType(id as ExploreChartType)}
            />
          </Panel>

          <Panel style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="title">
                {metricMeta.label} over time
              </AppText>
              <AppText variant="mono" selectable color={colors.lime}>
                {formatValue(timeSeries.reduce((s, p) => s + p.value, 0))}
              </AppText>
            </View>

            {chartType === 'line' ? (
              <LineChart
                values={timeSeries.map((p) => p.value)}
                labels={bucketLabels}
              />
            ) : (
              <>
                <StackedBarChart
                  buckets={stacked.buckets}
                  series={stacked.series}
                  bucketLabels={stacked.buckets.map((b) => formatBucketLabel(b, rollup))}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {stacked.series.map((ser) => (
                    <View key={ser.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: ser.color,
                        }}
                      />
                      <AppText variant="caption" numberOfLines={1}>
                        {ser.key === '__other__'
                          ? 'Other'
                          : groupBy === 'model'
                            ? shortModelName(ser.key)
                            : ser.key}
                      </AppText>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Panel>

          <Panel style={{ gap: spacing.lg }}>
            <AppText variant="title">
              {metricMeta.label} by {groupBy}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
              <Donut slices={donutSlices} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                {ranked.slice(0, 4).map((row, i) => (
                  <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: colors.chart[i % colors.chart.length],
                      }}
                    />
                    <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                      {groupBy === 'model' ? shortModelName(row.label) : row.label}
                    </AppText>
                    <AppText variant="mono" selectable style={{ fontSize: 12 }}>
                      {(row.share * 100).toFixed(0)}%
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
            <HorizontalBarChart rows={barRows} formatValue={formatValue} />
          </Panel>

          <Panel style={{ gap: spacing.sm }}>
            <AppText variant="label">Ranked table</AppText>
            {ranked.slice(0, 12).map((row, index) => (
              <View
                key={row.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <AppText variant="caption" style={{ width: 22, color: colors.textMuted }}>
                  {index + 1}
                </AppText>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" numberOfLines={1} selectable>
                    {groupBy === 'model' ? shortModelName(row.label) : row.label}
                  </AppText>
                  <AppText variant="caption">
                    {row.requests} req · {formatMetricValue('prompt_tokens', row.promptTokens)} in
                  </AppText>
                </View>
                <AppText variant="mono" selectable color={colors.limeSoft}>
                  {formatValue(row.value)}
                </AppText>
              </View>
            ))}
          </Panel>
        </>
      )}
    </ScrollView>
  );
}
