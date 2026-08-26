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
  stackedSeriesTotal,
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
  type RankedRow,
} from '@/lib/analytics/explore';
import {
  filterActivityByTimeframe,
  computeFleetPeriodSpend,
  computeLiveTodaySpend,
  fleetSpendLabel,
  isIntradayTimeframe,
  localDateString,
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

function mismatchCaption(
  timeframe: TimeframeId,
  rollup: ExploreRollup,
  field: 'usage_daily' | 'usage_weekly' | 'usage_monthly' | null
): string {
  if (rollup === 'minute') return ' (minute window is ≤3h)';
  if (rollup === 'hour') {
    if (field === 'usage_daily') return ' (hour series ≠ Keys daily counter)';
    if (field === 'usage_monthly') return ' (hour series ≠ Keys monthly counter)';
    return ' (hour series ≠ Keys weekly counter)';
  }
  if (field === 'usage_monthly') {
    return ' (activity days ≠ Keys billing-month counter)';
  }
  if (timeframe === '7d' || timeframe === '30d') {
    return ' (activity completed days ≠ Keys rolling counter)';
  }
  return '';
}

function rankedFromStacked(
  series: { key: string; values: number[] }[]
): RankedRow[] {
  const rows = series
    .filter((s) => s.key !== '__other__')
    .map((s) => {
      const value = s.values.reduce((a, b) => a + b, 0);
      return {
        key: s.key,
        label: s.key,
        value,
        share: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0,
        spend: 0,
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const other = series.find((s) => s.key === '__other__');
  if (other) {
    const value = other.values.reduce((a, b) => a + b, 0);
    if (value > 0) {
      rows.push({
        key: '__other__',
        label: 'Other',
        value,
        share: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0,
        spend: 0,
      });
    }
  }

  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return rows.map((r) => ({ ...r, share: r.value / total }));
}

/** Ensure day-rollup series includes a today bucket (often missing from Activity). */
function ensureTodayBucket(
  points: { bucket: string; value: number; label?: string }[],
  rollup: ExploreRollup,
  timeframe: TimeframeId
): { bucket: string; value: number; label: string }[] {
  if (rollup !== 'day' || (timeframe !== '7d' && timeframe !== '30d')) {
    return points.map((p) => ({
      ...p,
      label: p.label ?? formatBucketLabel(p.bucket, rollup),
    }));
  }
  const today = localDateString();
  if (points.some((p) => p.bucket === today)) {
    return points.map((p) => ({
      ...p,
      label: p.label ?? formatBucketLabel(p.bucket, rollup),
    }));
  }
  return [
    ...points.map((p) => ({
      ...p,
      label: p.label ?? formatBucketLabel(p.bucket, rollup),
    })),
    {
      bucket: today,
      value: 0,
      label: formatBucketLabel(today, rollup),
    },
  ].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

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
  const overviewAnalytics = useAnalyticsOverview(timeframe === '3h');

  const activity = useMemo(
    () => filterActivityByTimeframe(activityQuery.data ?? [], timeframe),
    [activityQuery.data, timeframe]
  );

  const fleetSpend = useMemo(
    () =>
      computeFleetPeriodSpend(
        keyQuery.data,
        keysQuery.data,
        Boolean(meta?.isManagementKey),
        timeframe
      ),
    [keyQuery.data, keysQuery.data, meta?.isManagementKey, timeframe]
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
    const aggregated = aggregateTimeSeries(activity, metric, rollup).map((p) => ({
      ...p,
      label: formatBucketLabel(p.bucket, rollup),
    }));
    return ensureTodayBucket(aggregated, rollup, timeframe);
  }, [
    useAnalytics,
    lineAnalytics.data,
    todayTrail,
    activity,
    metric,
    rollup,
    timeframe,
  ]);

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
        totals: [] as number[],
      };
    }
    const raw = aggregateStackedTimeSeries(activity, metric, groupBy, rollup, 5);
    let buckets = raw.buckets;
    let series = raw.series;
    let totals = raw.totals;
    if (rollup === 'day' && (timeframe === '7d' || timeframe === '30d')) {
      const today = localDateString();
      if (!buckets.includes(today)) {
        buckets = [...buckets, today].sort();
        series = series.map((s) => {
          const values = buckets.map((b) => {
            const idx = raw.buckets.indexOf(b);
            return idx >= 0 ? (s.values[idx] ?? 0) : 0;
          });
          return { ...s, values };
        });
        totals = buckets.map((_, i) =>
          series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0)
        );
      }
    }
    return {
      buckets,
      totals,
      series: series.map((s, i) => ({
        ...s,
        color:
          s.key === '__other__'
            ? colors.textMuted
            : colors.chart[i % colors.chart.length],
      })),
    };
  }, [
    useAnalytics,
    stackedAnalytics.data,
    activity,
    metric,
    groupBy,
    rollup,
    timeframe,
  ]);

  const ranked = useMemo(() => {
    if (useAnalytics && stacked.series.length > 0) {
      return rankedFromStacked(stacked.series);
    }
    return aggregateRanked(activity, metric, groupBy);
  }, [useAnalytics, stacked.series, activity, metric, groupBy]);

  const metricMeta = EXPLORE_METRICS.find((m) => m.id === metric)!;
  const formatValue = (n: number) => formatMetricValue(metric, n);

  /** Chart Sum always matches the visible chart (line or stacked bars). */
  const seriesTotal = useMemo(() => {
    if (todayTrail) {
      return liveToday?.spend ?? timeSeries[timeSeries.length - 1]?.value ?? 0;
    }
    if (chartType === 'bar' && stacked.buckets.length > 0) {
      return stacked.totals?.reduce((a, b) => a + b, 0) ?? stackedSeriesTotal(stacked.series);
    }
    return timeSeries.reduce((s, p) => s + p.value, 0);
  }, [
    todayTrail,
    liveToday?.spend,
    timeSeries,
    chartType,
    stacked.buckets.length,
    stacked.totals,
    stacked.series,
  ]);

  /**
   * Overview spend = timeframe total only (never depends on rollup).
   * today → Σ usage_daily · 7d → Σ usage_weekly · 30d → Σ usage_monthly · 3h → Analytics
   */
  const overview = useMemo(() => {
    const base = computeOverview(activity);

    if (timeframe === '3h' && overviewAnalytics.data?.totals) {
      return {
        spend: overviewAnalytics.data.totals.spend,
        byokSpend: overviewAnalytics.data.totals.byokSpend,
        requests: overviewAnalytics.data.totals.requests,
        promptTokens: overviewAnalytics.data.totals.promptTokens,
        completionTokens: overviewAnalytics.data.totals.completionTokens,
        reasoningTokens: overviewAnalytics.data.totals.reasoningTokens,
      };
    }

    if (
      fleetSpend.source !== 'none' &&
      (timeframe === 'today' || timeframe === '7d' || timeframe === '30d')
    ) {
      return { ...base, spend: fleetSpend.spend };
    }

    if (liveToday) {
      return { ...base, spend: liveToday.spend };
    }

    return base;
  }, [
    activity,
    timeframe,
    overviewAnalytics.data?.totals,
    fleetSpend,
    liveToday,
  ]);

  const overviewSpendLabel = useMemo(() => {
    if (timeframe === '3h') return 'Last 3h · Analytics total';
    if (fleetSpend.source === 'none') return null;
    const spend = fleetSpendLabel(timeframe);
    if (!spend) return null;
    const volumeFromActivity =
      timeframe === 'today' || timeframe === '7d' || timeframe === '30d';
    return volumeFromActivity ? `${spend} · tokens/req from Activity` : spend;
  }, [timeframe, fleetSpend.source]);

  const donutSlices = ranked.slice(0, 5).map((row, i) => ({
    value: row.value,
    color: colors.chart[i % colors.chart.length],
  }));

  const barRows = ranked.map((row, i) => ({
    label:
      row.key === '__other__'
        ? 'Other'
        : groupBy === 'model'
          ? shortModelName(row.label)
          : row.label,
    value: row.value,
    share: row.share,
    color: colors.chart[i % colors.chart.length],
  }));

  const chartLabels = timeSeries.map((p) => p.label);
  const empty =
    !useAnalytics &&
    activity.length === 0 &&
    !isIntradayTimeframe(timeframe) &&
    !todayTrail;
  const analyticsNote =
    lineAnalytics.data?.rangeNote ??
    stackedAnalytics.data?.rangeNote ??
    overviewAnalytics.data?.rangeNote ??
    null;
  const truncated =
    Boolean(lineAnalytics.data?.truncated) ||
    Boolean(stackedAnalytics.data?.truncated) ||
    Boolean(overviewAnalytics.data?.truncated);

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

  const showBar = chartType === 'bar' && stacked.buckets.length > 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.limeSoft}
        />
      }
    >
      {activityQuery.isLoading && !useAnalytics ? (
        <ActivityIndicator color={colors.limeSoft} />
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
                sourceLabel={overviewSpendLabel}
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

                {metric === 'spend' &&
                Math.abs(overview.spend - seriesTotal) > 0.005 ? (
                  <AppText variant="caption">
                    Chart sum {formatValue(seriesTotal)} · Overview{' '}
                    {formatValue(overview.spend)}
                    {mismatchCaption(timeframe, rollup, fleetSpend.field)}
                  </AppText>
                ) : null}

                {analyticsNote ? (
                  <AppText variant="caption">{analyticsNote}</AppText>
                ) : null}

                {truncated ? (
                  <AppText variant="caption" color={colors.red}>
                    Analytics response truncated — Chart Sum may be incomplete. Narrow
                    the range or use Day rollup.
                  </AppText>
                ) : null}

                {chartLoading ? (
                  <ActivityIndicator color={colors.limeSoft} />
                ) : chartError ? (
                  <AppText color={colors.red} selectable>
                    {chartError.message}
                  </AppText>
                ) : !useAnalytics &&
                  isIntradayTimeframe(timeframe) &&
                  metric !== 'spend' ? (
                  <AppText variant="caption">
                    {timeframe === '3h'
                      ? 'Pick Minute or Hour rollup for a real 3-hour Analytics series.'
                      : 'Today only has live spend from /key unless you pick Minute or Hour rollup (Analytics API).'}
                  </AppText>
                ) : showBar ? (
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
                    {useAnalytics
                      ? 'No breakdown rows in this Analytics window yet.'
                      : 'Model breakdown needs completed Activity days — try 7d / 30d, or use stacked chart with Minute/Hour rollup.'}
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
                              {row.key === '__other__'
                                ? 'Other'
                                : groupBy === 'model'
                                  ? shortModelName(row.label)
                                  : row.label}
                            </AppText>
                            <AppText
                              variant="mono"
                              selectable
                              style={{ fontSize: 11, color: colors.text }}
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
                    {useAnalytics ? (
                      <AppText variant="caption">
                        Breakdown from same Analytics stacked series as the chart
                      </AppText>
                    ) : null}
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
