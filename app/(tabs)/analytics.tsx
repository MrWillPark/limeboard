import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import {
  Donut,
  HorizontalBarChart,
  LineChart,
  StackedBarChart,
} from '@/components/charts/charts';
import { ExploreFilters } from '@/components/explore/explore-filters';
import { ExploreOverview } from '@/components/explore/explore-overview';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, spacing } from '@/constants/theme';
import {
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
  const seriesTotal = useMemo(
    () => timeSeries.reduce((s, p) => s + p.value, 0),
    [timeSeries]
  );

  const donutSlices = ranked.slice(0, 5).map((row, i) => ({
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
  const empty = activity.length === 0 && timeframe !== 'today';

  const filters = (
    <ExploreFilters
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
      metric={metric}
      onMetricChange={setMetric}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      rollup={rollup}
      onRollupChange={setRollup}
      chartType={chartType}
      onChartTypeChange={setChartType}
    />
  );

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
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={activityQuery.isFetching}
          onRefresh={() => activityQuery.refetch()}
          tintColor={colors.lime}
        />
      }
    >
      <AppText variant="display">Explore</AppText>

      {activityQuery.isLoading ? (
        <ActivityIndicator color={colors.lime} />
      ) : activityQuery.isError ? (
        <Panel>
          <AppText color={colors.red} selectable>
            {(activityQuery.error as Error).message}
          </AppText>
        </Panel>
      ) : (
        <>
          {filters}

          {empty ? (
            <Panel>
              <AppText>No activity in {timeframeLabel(timeframe).toLowerCase()}.</AppText>
            </Panel>
          ) : (
            <>
              <ExploreOverview
                totals={overview}
                timeframe={timeframe}
                liveSpend={timeframe === 'today'}
              />

              <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <AppText variant="title" style={{ fontSize: 16 }}>
                    {metricMeta.label} over time
                  </AppText>
                  <AppText variant="mono" selectable color={colors.lime} style={{ fontSize: 13 }}>
                    {formatValue(seriesTotal)}
                  </AppText>
                </View>

                {chartType === 'line' ? (
                  <LineChart
                    values={timeSeries.map((p) => p.value)}
                    labels={bucketLabels}
                    height={132}
                  />
                ) : (
                  <>
                    <StackedBarChart
                      buckets={stacked.buckets}
                      series={stacked.series}
                      height={132}
                      bucketLabels={stacked.buckets.map((b) =>
                        formatBucketLabel(b, rollup)
                      )}
                    />
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                      }}
                    >
                      {stacked.series.map((ser) => (
                        <View
                          key={ser.key}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
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

              <Panel style={{ gap: spacing.md, padding: spacing.md }}>
                <AppText variant="title" style={{ fontSize: 16 }}>
                  {metricMeta.label} by {groupBy}
                </AppText>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  <Donut slices={donutSlices} size={96} strokeWidth={14} />
                  <View style={{ flex: 1, gap: 6 }}>
                    {ranked.slice(0, 4).map((row, i) => (
                      <View
                        key={row.key}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            backgroundColor: colors.chart[i % colors.chart.length],
                          }}
                        />
                        <AppText variant="caption" numberOfLines={1} style={{ flex: 1, color: colors.text }}>
                          {groupBy === 'model' ? shortModelName(row.label) : row.label}
                        </AppText>
                        <AppText variant="mono" selectable style={{ fontSize: 11, color: colors.limeSoft }}>
                          {formatValue(row.value)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
                <HorizontalBarChart rows={barRows} formatValue={formatValue} maxRows={6} compact />
              </Panel>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
