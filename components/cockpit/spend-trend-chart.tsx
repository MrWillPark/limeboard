import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import {
  InteractiveLineChart,
  InteractiveStackedBarChart,
} from '@/components/charts/interactive-charts';
import { AppText } from '@/components/ui/app-text';
import { Panel } from '@/components/ui/panel';
import { colors, radii, spacing } from '@/constants/theme';
import {
  COCKPIT_METRICS,
  buildCockpitLineSeries,
  buildCockpitStackedFromAnalytics,
  buildCockpitStackedSeries,
  cockpitAnalyticsRollup,
  cockpitIntradayStack,
  cockpitMetricValue,
  cockpitToExploreMetric,
  formatCockpitMetric,
  mergeStackedSeries,
  modelBreakdownForDay,
  slicesAtBucket,
  stackedModeAvailable,
  type CockpitChartMode,
  type CockpitMetric,
  type CockpitStackedSeries,
} from '@/lib/analytics/cockpit-charts';
import { shortModelName } from '@/lib/analytics/explore';
import {
  localDateString,
  normalizeDayKey,
  timeframeLabel,
  type TimeframeId,
} from '@/lib/analytics/timeframe';
import { useAnalyticsSeries } from '@/hooks/use-openrouter';
import type { ActivityItem } from '@/lib/openrouter/types';

type Props = {
  activity: ActivityItem[];
  timeframe: TimeframeId;
  total: number;
  lineSeries: { date: string; value: number; label?: string }[];
  dataSource?: 'activity' | 'live_key' | 'fleet_keys';
  isManagementKey?: boolean;
};

type ColoredStackedSeries = CockpitStackedSeries & {
  series: { key: string; color: string; values: number[] }[];
};

function colorizeStacked(raw: CockpitStackedSeries): ColoredStackedSeries {
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
}

export function SpendTrendChart({
  activity,
  timeframe,
  total,
  lineSeries,
  dataSource,
  isManagementKey,
}: Props) {
  const [metric, setMetric] = useState<CockpitMetric>('spend');
  const [mode, setMode] = useState<CockpitChartMode>('stack');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const intraday = cockpitIntradayStack(timeframe);
  const analyticsRollup = cockpitAnalyticsRollup(timeframe);
  const exploreMetric = cockpitToExploreMetric(metric);

  const primaryAnalytics = useAnalyticsSeries({
    metric: exploreMetric,
    groupBy: 'model',
    rollup: analyticsRollup,
    timeframe,
    withDimension: true,
    enabled: intraday,
  });

  const completionAnalytics = useAnalyticsSeries({
    metric: 'completion_tokens',
    groupBy: 'model',
    rollup: analyticsRollup,
    timeframe,
    withDimension: true,
    enabled: intraday && metric === 'tokens',
  });

  const canStack = stackedModeAvailable(timeframe, activity, { isManagementKey });

  useEffect(() => {
    setSelectedIndex(null);
    if (!canStack) {
      setMode('line');
      return;
    }
    setMode('stack');
  }, [timeframe, canStack]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [metric]);

  const lineData = useMemo(
    () => buildCockpitLineSeries(activity, timeframe, metric, lineSeries),
    [activity, timeframe, metric, lineSeries]
  );

  const activityStacked = useMemo(() => {
    if (intraday || activity.length === 0) return null;
    return colorizeStacked(buildCockpitStackedSeries(activity, metric));
  }, [intraday, activity, metric]);

  const analyticsStacked = useMemo(() => {
    if (!intraday || !primaryAnalytics.data) return null;

    let raw = buildCockpitStackedFromAnalytics(
      primaryAnalytics.data.data,
      primaryAnalytics.data.metricId,
      primaryAnalytics.data.granularity as 'minute' | 'hour',
      primaryAnalytics.data.rangeStart,
      primaryAnalytics.data.rangeEnd
    );

    if (
      metric === 'tokens' &&
      completionAnalytics.data &&
      completionAnalytics.data.granularity === primaryAnalytics.data.granularity
    ) {
      const completion = buildCockpitStackedFromAnalytics(
        completionAnalytics.data.data,
        completionAnalytics.data.metricId,
        completionAnalytics.data.granularity as 'minute' | 'hour',
        completionAnalytics.data.rangeStart,
        completionAnalytics.data.rangeEnd
      );
      raw = mergeStackedSeries(raw, completion);
    }

    return colorizeStacked(raw);
  }, [intraday, metric, primaryAnalytics.data, completionAnalytics.data]);

  const stacked = intraday ? analyticsStacked : activityStacked;
  const stackLoading =
    intraday &&
    mode === 'stack' &&
    (primaryAnalytics.isLoading ||
      (metric === 'tokens' && completionAnalytics.isLoading));

  const analyticsNote =
    primaryAnalytics.data?.rangeNote ?? completionAnalytics.data?.rangeNote ?? null;

  const activeCount = mode === 'stack' && stacked ? stacked.buckets.length : lineData.length;

  useEffect(() => {
    if (selectedIndex != null && selectedIndex >= activeCount) {
      setSelectedIndex(activeCount > 0 ? activeCount - 1 : null);
    }
  }, [activeCount, selectedIndex]);

  const scrubValue = useMemo(() => {
    if (selectedIndex == null) return null;
    if (mode === 'stack' && stacked) {
      return {
        label: stacked.bucketLabels[selectedIndex] ?? '—',
        value: stacked.totals[selectedIndex] ?? 0,
        date: stacked.buckets[selectedIndex],
      };
    }
    const pt = lineData[selectedIndex];
    if (!pt) return null;
    return { label: pt.label, value: pt.value, date: pt.date };
  }, [selectedIndex, mode, stacked, lineData]);

  const periodMetricTotal = useMemo(() => {
    if (metric === 'spend') return total;
    return activity.reduce((s, row) => s + cockpitMetricValue(row, metric), 0);
  }, [metric, total, activity]);

  const scrubSlices = useMemo(() => {
    if (selectedIndex == null) return [];
    if (mode === 'stack' && stacked) {
      return slicesAtBucket(stacked, selectedIndex);
    }
    if (timeframe === 'today') {
      return modelBreakdownForDay(activity, localDateString(), metric);
    }
    if (scrubValue?.date) {
      const day = normalizeDayKey(scrubValue.date) ?? scrubValue.date.slice(0, 10);
      return modelBreakdownForDay(activity, day, metric);
    }
    return [];
  }, [selectedIndex, mode, stacked, scrubValue, activity, metric, timeframe]);

  const headlineValue =
    scrubValue != null
      ? formatCockpitMetric(metric, scrubValue.value)
      : formatCockpitMetric(metric, periodMetricTotal);

  const headlineLabel =
    scrubValue != null ? scrubValue.label : `${timeframeLabel(timeframe)} total`;

  const pick = (fn: () => void) => {
    if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
    fn();
  };

  return (
    <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <AppText variant="title" style={{ fontSize: 16 }}>
            Spend trend
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Drag across the chart to inspect a point
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <AppText variant="mono" selectable color={colors.lime} style={{ fontSize: 15 }}>
            {headlineValue}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {headlineLabel}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {COCKPIT_METRICS.map((m) => (
          <Chip
            key={m.id}
            label={m.short}
            active={metric === m.id}
            onPress={() => pick(() => setMetric(m.id))}
          />
        ))}
        <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 2 }} />
        <Chip
          label="Line"
          active={mode === 'line'}
          onPress={() => pick(() => setMode('line'))}
        />
        <Chip
          label="Stack"
          active={mode === 'stack'}
          disabled={!canStack}
          onPress={() => canStack && pick(() => setMode('stack'))}
        />
      </View>

      {stackLoading ? (
        <ActivityIndicator color={colors.limeSoft} style={{ marginVertical: spacing.md }} />
      ) : mode === 'stack' && stacked ? (
        <>
          <InteractiveStackedBarChart
            buckets={stacked.buckets}
            series={stacked.series}
            bucketLabels={stacked.bucketLabels}
            height={148}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
          <Legend series={stacked.series} />
        </>
      ) : mode === 'stack' && intraday && !stackLoading ? (
        <AppText variant="caption" color={colors.textMuted}>
          No Analytics buckets in this window yet.
        </AppText>
      ) : (
        <InteractiveLineChart
          values={lineData.map((p) => p.value)}
          labels={lineData.map((p) => p.label)}
          height={148}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
        />
      )}

      {scrubSlices.length > 0 ? (
        <View
          style={{
            gap: 6,
            paddingTop: spacing.xs,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <AppText variant="label" style={{ fontSize: 10 }}>
            At {scrubValue?.label} · by model
          </AppText>
          {scrubSlices.slice(0, 4).map((slice, i) => (
            <View
              key={slice.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  backgroundColor: colors.chart[i % colors.chart.length],
                }}
              />
              <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                {slice.key === '__other__' ? 'Other' : shortModelName(slice.key)}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {(slice.share * 100).toFixed(0)}%
              </AppText>
              <AppText variant="mono" selectable style={{ fontSize: 11, color: colors.text }}>
                {formatCockpitMetric(metric, slice.value)}
              </AppText>
            </View>
          ))}
        </View>
      ) : selectedIndex != null ? (
        <AppText variant="caption" color={colors.textMuted}>
          No model activity at this point
        </AppText>
      ) : (
        <AppText variant="caption" color={colors.textMuted}>
          {canStack
            ? intraday
              ? `${timeframeLabel(timeframe)} · ${analyticsRollup} buckets · Analytics · by model`
              : `${timeframeLabel(timeframe)} · stacked by model · ${dataSource === 'fleet_keys' ? 'period spend from Keys' : 'Activity'}`
            : 'Stacked view needs a management key for Today / 3h'}
        </AppText>
      )}

      {analyticsNote ? (
        <AppText variant="caption" color={colors.textMuted}>
          {analyticsNote}
        </AppText>
      ) : null}
    </Panel>
  );
}

function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.sm,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: active ? colors.limeGlow : colors.border,
        backgroundColor: active ? colors.limeDim : colors.bgElevated,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <AppText
        style={{
          fontSize: 11,
          color: active ? colors.limeSoft : colors.textSecondary,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function Legend({ series }: { series: { key: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {series.map((ser) => (
        <View key={ser.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              backgroundColor: ser.color,
            }}
          />
          <AppText variant="caption" numberOfLines={1}>
            {ser.key === '__other__' ? 'Other' : shortModelName(ser.key)}
          </AppText>
        </View>
      ))}
    </View>
  );
}
