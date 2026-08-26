import type { ActivityItem } from '@/lib/openrouter/types';

import {
  fillStackedGaps,
  formatAnalyticsBucketLabel,
  rowsToStackedSeries,
} from '@/lib/analytics/analytics-query';
import { formatChartDate, formatTokens, formatUsd } from '@/lib/analytics/burn';
import type { ExploreMetric } from '@/lib/analytics/explore';
import {
  formatDayKeyLabel,
  localDateString,
  normalizeDayKey,
  type TimeframeId,
} from '@/lib/analytics/timeframe';

export type CockpitMetric = 'spend' | 'requests' | 'tokens';
export type CockpitChartMode = 'line' | 'stack';

export type CockpitTrendPoint = {
  date: string;
  value: number;
  label: string;
};

export type CockpitStackedSeries = {
  buckets: string[];
  bucketLabels: string[];
  series: { key: string; values: number[] }[];
  totals: number[];
};

export type BucketSlice = {
  key: string;
  value: number;
  share: number;
};

export const COCKPIT_METRICS: { id: CockpitMetric; label: string; short: string }[] = [
  { id: 'spend', label: 'Spend', short: '$' },
  { id: 'requests', label: 'Requests', short: 'req' },
  { id: 'tokens', label: 'Tokens', short: 'tok' },
];

export function cockpitMetricValue(row: ActivityItem, metric: CockpitMetric): number {
  switch (metric) {
    case 'spend':
      return row.usage;
    case 'requests':
      return row.requests;
    case 'tokens':
      return row.prompt_tokens + row.completion_tokens;
  }
}

export function formatCockpitMetric(metric: CockpitMetric, value: number): string {
  if (metric === 'spend') return formatUsd(value);
  return formatTokens(value);
}

export function cockpitIntradayStack(timeframe: TimeframeId): boolean {
  return timeframe === 'today' || timeframe === '3h';
}

export function cockpitAnalyticsRollup(timeframe: TimeframeId): 'minute' | 'hour' {
  return timeframe === '3h' ? 'minute' : 'hour';
}

export function cockpitToExploreMetric(metric: CockpitMetric): ExploreMetric {
  switch (metric) {
    case 'spend':
      return 'spend';
    case 'requests':
      return 'requests';
    case 'tokens':
      return 'prompt_tokens';
  }
}

/**
 * Activity is daily-only — no intraday model buckets for Today/3h.
 * Those windows use the Analytics API (same as Explore minute/hour rollups).
 */
export function stackedModeAvailable(
  timeframe: TimeframeId,
  activity: ActivityItem[],
  options?: { isManagementKey?: boolean }
): boolean {
  if (cockpitIntradayStack(timeframe)) {
    return Boolean(options?.isManagementKey);
  }
  return activity.length > 0;
}

export function buildCockpitStackedFromAnalytics(
  rows: Record<string, string | number | null>[],
  metricId: string,
  granularity: 'minute' | 'hour',
  rangeStart: string,
  rangeEnd: string,
  topN = 5
): CockpitStackedSeries {
  const raw = rowsToStackedSeries(rows, metricId, 'model', granularity, topN);
  const filled = fillStackedGaps(raw, granularity, rangeStart, rangeEnd);
  return {
    buckets: filled.buckets,
    bucketLabels: filled.buckets.map((b) => formatAnalyticsBucketLabel(b, granularity)),
    series: filled.series,
    totals: filled.totals,
  };
}

/** Sum two stacked series (e.g. prompt + completion tokens). */
export function mergeStackedSeries(
  a: CockpitStackedSeries,
  b: CockpitStackedSeries
): CockpitStackedSeries {
  const buckets =
    a.buckets.length >= b.buckets.length ? a.buckets : b.buckets;
  const bucketLabels = buckets.map(
    (_, i) => a.bucketLabels[i] ?? b.bucketLabels[i] ?? buckets[i]!
  );

  const keys = new Set([
    ...a.series.map((s) => s.key),
    ...b.series.map((s) => s.key),
  ]);

  const series = [...keys].map((key) => ({
    key,
    values: buckets.map((_, i) => {
      const av = a.series.find((s) => s.key === key)?.values[i] ?? 0;
      const bv = b.series.find((s) => s.key === key)?.values[i] ?? 0;
      return av + bv;
    }),
  }));

  const totals = buckets.map((_, i) =>
    series.reduce((sum, ser) => sum + (ser.values[i] ?? 0), 0)
  );

  return { buckets, bucketLabels, series, totals };
}

/** Daily line buckets from Activity (non-cumulative). */
export function buildCockpitLineSeries(
  activity: ActivityItem[],
  timeframe: TimeframeId,
  metric: CockpitMetric,
  todayTrail?: { date: string; value: number; label?: string }[]
): CockpitTrendPoint[] {
  if (timeframe === 'today' && todayTrail) {
    return todayTrail.map((p) => ({
      date: p.date,
      value: p.value,
      label: p.label ?? formatChartDate(p.date),
    }));
  }

  const byDate = new Map<string, number>();
  for (const row of activity) {
    const day = normalizeDayKey(row.date);
    if (!day) continue;
    byDate.set(day, (byDate.get(day) ?? 0) + cockpitMetricValue(row, metric));
  }

  let points = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value,
      label: formatChartDate(date),
    }));

  if (
    metric === 'spend' &&
    (timeframe === '7d' || timeframe === '30d') &&
    !points.some((p) => p.date === localDateString())
  ) {
    const today = localDateString();
    points = [
      ...points,
      { date: today, value: 0, label: formatDayKeyLabel(today) },
    ].sort((a, b) => a.date.localeCompare(b.date));
  }

  return points;
}

/** Stacked daily bars: model × metric volume. */
export function buildCockpitStackedSeries(
  activity: ActivityItem[],
  metric: CockpitMetric,
  topN = 5
): CockpitStackedSeries {
  const modelTotals = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();
  const bucketSet = new Set<string>();

  for (const row of activity) {
    const day = normalizeDayKey(row.date);
    if (!day) continue;
    bucketSet.add(day);
    const value = cockpitMetricValue(row, metric);
    modelTotals.set(row.model, (modelTotals.get(row.model) ?? 0) + value);
    if (!matrix.has(day)) matrix.set(day, new Map());
    const dayMap = matrix.get(day)!;
    dayMap.set(row.model, (dayMap.get(row.model) ?? 0) + value);
  }

  const topModels = [...modelTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([model]) => model);
  const topSet = new Set(topModels);

  let buckets = [...bucketSet].sort();
  const today = localDateString();
  if (!buckets.includes(today)) {
    buckets = [...buckets, today].sort();
  }

  const seriesKeys = [...topModels];
  const hasOther = [...matrix.values()].some((m) =>
    [...m.entries()].some(([k, v]) => !topSet.has(k) && v > 0)
  );
  if (hasOther) seriesKeys.push('__other__');

  const series = seriesKeys.map((key) => ({
    key,
    values: buckets.map((b) => {
      const m = matrix.get(b);
      if (!m) return 0;
      if (key === '__other__') {
        let other = 0;
        for (const [k, v] of m) {
          if (!topSet.has(k)) other += v;
        }
        return other;
      }
      return m.get(key) ?? 0;
    }),
  }));

  const totals = buckets.map((_, i) => series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  const bucketLabels = buckets.map((b) => formatChartDate(b));

  return { buckets, bucketLabels, series, totals };
}

export function slicesAtBucket(
  stacked: CockpitStackedSeries,
  index: number
): BucketSlice[] {
  const total = stacked.totals[index] ?? 0;
  if (total <= 0) return [];

  return stacked.series
    .map((s) => ({
      key: s.key,
      value: s.values[index] ?? 0,
      share: total > 0 ? (s.values[index] ?? 0) / total : 0,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Model breakdown for a single UTC day (line scrub on 7d/30d). */
export function modelBreakdownForDay(
  activity: ActivityItem[],
  day: string,
  metric: CockpitMetric,
  topN = 4
): BucketSlice[] {
  const totals = new Map<string, number>();
  let sum = 0;

  for (const row of activity) {
    if (normalizeDayKey(row.date) !== day) continue;
    const v = cockpitMetricValue(row, metric);
    sum += v;
    totals.set(row.model, (totals.get(row.model) ?? 0) + v);
  }

  if (sum <= 0) return [];

  return [...totals.entries()]
    .map(([key, value]) => ({ key, value, share: value / sum }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}
