import { useEffect, useMemo, useState } from 'react';
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
  fillStackedGaps,
  fillTimeSeriesGaps,
  needsAnalyticsApi,
  rowsToStackedSeries,
  rowsToTimeSeries,
} from '@/lib/analytics/analytics-query';
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
  isIntradayTimeframe,
  timeframeLabel,
  type TimeframeId,
} from '@/lib/analytics/timeframe';
import { buildTodayTrendSeries, recordTodaySpendSample } from '@/lib/analytics/today-trail';
import {
  useActivity,
  useAnalyticsOverview,
  useAnalyticsSeries,
  useKeyInfo,
  useManagedKeys,
} from '@/hooks/use-openrouter';
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

  const useAnalytics = needsAnalyticsApi(rollup);

  const lineAnalytics = useAnalyticsSeries({
    metric,
    groupBy,
    rollup,
    timeframe,
    withDimension: false,
  });
  const stackedAnalytics = useAnalyticsSeries({
    metric,
    groupBy,
    rollup,
    timeframe,
    withDimension: true,
  });
  const overviewAnalytics = useAnalyticsOverview(
    timeframe,
    rollup,
    timeframe === '3h'
  );

  const activity = useMemo(
    () => filterActivityByTimeframe(activityQuery.data ?? [], timeframe),
    [activityQuery.data, timeframe]
  );

  const liveToday = useMemo(() => {
    if (timeframe !== 'today' || useAnalytics) return null;
    return computeLiveTodaySpend(
      keyQuery.data,
      keysQuery.data,
      Boolean(meta?.isManagementKey)
    );
  }, [
    timeframe,
    useAnalytics,
    keyQuery.data,
    keysQuery.data,
    meta?.isManagementKey,
  ]);

  const ranked = useMemo(
    () => aggregateRanked(activity, metric, groupBy),
    [activity, metric, groupBy]
  );

  const todayTrail = useMemo(() => {
    if (useAnalytics) return null;
    if (timeframe !== 'today' || metric !== 'spend') return null;
    return buildTodayTrendSeries(liveToday?.spend ?? 0);
  }, [
    useAnalytics,
    timeframe,
    metric,
    liveToday?.spend,
    keyQuery.dataUpdatedAt,
    keysQuery.dataUpdatedAt,
  ]);

  useEffect(() => {
    if (useAnalytics || timeframe !== 'today') return;
    recordTodaySpendSample(liveToday?.spend ?? 0);
  }, [
    useAnalytics,
    timeframe,
    liveToday?.spend,
    keyQuery.dataUpdatedAt,
    keysQuery.dataUpdatedAt,
  ]);

  const timeSeries = useMemo(() => {
    if (useAnalytics && lineAnalytics.data) {
      const raw = rowsToTimeSeries(
        lineAnalytics.data.data,
        lineAnalytics.data.metricId,
        lineAnalytics.data.granularity
      );
      return fillTimeSeriesGaps(
        raw,
        lineAnalytics.data.granularity,
        lineAnalytics.data.rangeStart,
        lineAnalytics.data.rangeEnd
      );
    }
    if (todayTrail) {
      return todayTrail.map((p) => ({
        bucket: p.date,
        value: p.value,
        label: p.label,
      }));
    }
    if (useAnalytics) return [];
    return aggregateTimeSeries(activity, metric, rollup).map((p) => ({
      ...p,
      label: formatBucketLabel(p.bucket, rollup),
    }));
  }, [useAnalytics, lineAnalytics.data, todayTrail, activity, metric, rollup]);

  const stacked = useMemo(() => {
    if (useAnalytics && stackedAnalytics.data) {
      const raw = rowsToStackedSeries(
        stackedAnalytics.data.data,
        stackedAnalytics.data.metricId,
        stackedAnalytics.data.dimension,
        stackedAnalytics.data.granularity,
        5
      );
      const filled = fillStackedGaps(
        raw,
        stackedAnalytics.data.granularity,
        stackedAnalytics.data.rangeStart,
        stackedAnalytics.data.rangeEnd
      );
      return {
        ...filled,
        series: filled.series.map((s, i) => ({
          ...s,
          color:
            s.key === '__other__'
              ? colors.textMuted
              : colors.chart[i % colors.chart.length],
        })),
      };
    }
    if (useAnalytics || isIntradayTimeframe(timeframe)) {
      return {
        buckets: [] as string[],
        series: [] as { key: string; color: string; values: number[] }[],
      };
    }
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
  }, [useAnalytics, stackedAnalytics.data, activity, metric, groupBy, rollup, timeframe]);

  const metricMeta = EXPLORE_METRICS.find((m) => m.id === metric)!;
  const formatValue = (n: number) => formatMetricValue(metric, n);

  const seriesTotal = useMemo(() => {
    // Today session trail points are cumulative live spend, not per-bucket deltas.
    if (todayTrail) {
      return liveToday?.spend ?? timeSeries[timeSeries.length - 1]?.value ?? 0;
    }
    return timeSeries.reduce((s, p) => s + p.value, 0);
  }, [todayTrail, liveToday?.spend, timeSeries]);

  /** Overview spend must match the Spend-over-time total for the active window. */
  const overview = useMemo(() => {
    const base = computeOverview(activity);
    const fromAnalytics = overviewAnalytics.data?.totals;

    if (fromAnalytics) {
      const totals = {
        spend: fromAnalytics.spend,
        byokSpend: fromAnalytics.byokSpend,
        requests: fromAnalytics.requests,
        promptTokens: fromAnalytics.promptTokens,
        completionTokens: fromAnalytics.completionTokens,
        reasoningTokens: fromAnalytics.reasoningTokens,
      };
      // Prefer chart series sum for the active metric so KPI == chart header.
      if (metric === 'spend') totals.spend = seriesTotal;
      if (metric === 'requests') totals.requests = seriesTotal;
      if (metric === 'prompt_tokens') totals.promptTokens = seriesTotal;
      if (metric === 'completion_tokens') totals.completionTokens = seriesTotal;
      if (metric === 'reasoning_tokens') totals.reasoningTokens = seriesTotal;
      if (metric === 'byok_spend') totals.byokSpend = seriesTotal;
      return totals;
    }

    if (liveToday) {
      return { ...base, spend: liveToday.spend };
    }

    // Activity path: spend KPI == sum of daily series for this timeframe
    if (metric === 'spend') {
      return { ...base, spend: seriesTotal };
    }
    return base;
  }, [
    activity,
    overviewAnalytics.data?.totals,
    liveToday,
    metric,
    seriesTotal,
  ]);

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

  const chartLabels = timeSeries.map((p) => p.label);
  const empty =
    !useAnalytics &&
    activity.length === 0 &&
    !isIntradayTimeframe(timeframe);
  const analyticsNote =
    lineAnalytics.data?.rangeNote ??
    stackedAnalytics.data?.rangeNote ??
    overviewAnalytics.data?.rangeNote ??
    null;

  const refreshing =
    activityQuery.isFetching ||
    lineAnalytics.isFetching ||
    stackedAnalytics.isFetching ||
    overviewAnalytics.isFetching;

  const onRefresh = () => {
    activityQuery.refetch();
    keyQuery.refetch();
    keysQuery.refetch();
    if (useAnalytics || timeframe === '3h') {
      lineAnalytics.refetch();
      stackedAnalytics.refetch();
      overviewAnalytics.refetch();
    }
  };

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
            Explore needs a management key for Activity and Analytics (including
            minute rollups).
          </AppText>
        </Panel>
      </ScrollView>
    );
  }

  const chartLoading = useAnalytics && (lineAnalytics.isLoading || stackedAnalytics.isLoading);
  const chartError = useAnalytics
    ? ((lineAnalytics.error ?? stackedAnalytics.error) as Error | null)
    : null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.lime}
        />
      }
    >
      {activityQuery.isLoading && !useAnalytics ? (
        <ActivityIndicator color={colors.lime} />
      ) : activityQuery.isError && !useAnalytics ? (
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
                liveSpend={Boolean(liveToday)}
                analytics={Boolean(overviewAnalytics.data) || useAnalytics}
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

                {analyticsNote ? (
                  <AppText variant="caption">{analyticsNote}</AppText>
                ) : null}

                {chartLoading ? (
                  <ActivityIndicator color={colors.lime} />
                ) : chartError ? (
                  <AppText color={colors.red} selectable>
                    {chartError.message}
                  </AppText>
                ) : !useAnalytics &&
                  isIntradayTimeframe(timeframe) &&
                  metric !== 'spend' ? (
                  <AppText variant="caption">
                    {timeframe === '3h'
                      ? 'Pick Minute rollup for a real 3-hour Analytics series.'
                      : 'Today only has live spend from /key unless you pick Minute or Hour rollup (Analytics API).'}
                  </AppText>
                ) : chartType === 'bar' && stacked.buckets.length > 0 ? (
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
                    {useAnalytics ? (
                      <AppText variant="caption">
                        {rollup === 'minute' ? 'Minute' : 'Hour'} buckets · stacked by{' '}
                        {groupBy} · Analytics API
                        {stacked.buckets.length > 0
                          ? ` · ${stacked.buckets.filter((_, i) =>
                              stacked.series.some((s) => (s.values[i] ?? 0) > 0)
                            ).length}/${stacked.buckets.length} active`
                          : ''}
                      </AppText>
                    ) : null}
                  </>
                ) : (
                  <>
                    <LineChart
                      values={timeSeries.map((p) => p.value)}
                      labels={chartLabels}
                      height={132}
                      showDots={!useAnalytics || timeSeries.length <= 48}
                    />
                    {useAnalytics ? (
                      <AppText variant="caption">
                        {rollup === 'minute' ? 'Minute' : 'Hour'} buckets · Analytics API
                        {timeSeries.length > 0
                          ? ` · ${timeSeries.filter((p) => p.value > 0).length}/${timeSeries.length} active`
                          : ''}
                      </AppText>
                    ) : timeframe === 'today' ? (
                      <AppText variant="caption">
                        Midnight → now · trail grows as you refresh (live /key)
                      </AppText>
                    ) : timeframe === '3h' && !useAnalytics ? (
                      <AppText variant="caption">
                        Switch Rollup to Minute for last-3-hour Analytics buckets.
                      </AppText>
                    ) : null}
                  </>
                )}
              </Panel>

              <Panel style={{ gap: spacing.md, padding: spacing.md }}>
                <AppText variant="title" style={{ fontSize: 16 }}>
                  {metricMeta.label} by {groupBy}
                </AppText>
                {ranked.length === 0 ? (
                  <AppText variant="caption">
                    Model breakdown needs completed Activity days — try 7d / 30d, or use
                    stacked chart with Minute rollup.
                  </AppText>
                ) : (
                  <>
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
                            <AppText
                              variant="caption"
                              numberOfLines={1}
                              style={{ flex: 1, color: colors.text }}
                            >
                              {groupBy === 'model'
                                ? shortModelName(row.label)
                                : row.label}
                            </AppText>
                            <AppText
                              variant="mono"
                              selectable
                              style={{ fontSize: 11, color: colors.limeSoft }}
                            >
                              {formatValue(row.value)}
                            </AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                    <HorizontalBarChart
                      rows={barRows}
                      formatValue={formatValue}
                      maxRows={6}
                      compact
                    />
                  </>
                )}
              </Panel>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
