import type { ExploreGroupBy, ExploreMetric, ExploreRollup } from '@/lib/analytics/explore';
import type { TimeframeId } from '@/lib/analytics/timeframe';
import type { AnalyticsQueryBody } from '@/lib/openrouter/client';

/** Map LimeBoard Explore metrics → OpenRouter Analytics metric ids. */
export function analyticsMetricId(metric: ExploreMetric): string {
  switch (metric) {
    case 'spend':
      return 'total_usage';
    case 'requests':
      return 'request_count';
    case 'prompt_tokens':
      return 'tokens_prompt';
    case 'completion_tokens':
      return 'tokens_completion';
    case 'reasoning_tokens':
      return 'tokens_reasoning';
    case 'byok_spend':
      return 'byok_fees';
    default:
      return 'total_usage';
  }
}

export function analyticsDimensionId(groupBy: ExploreGroupBy): string {
  return groupBy === 'provider' ? 'provider' : 'model';
}

export function analyticsGranularity(
  rollup: ExploreRollup
): AnalyticsQueryBody['granularity'] | undefined {
  if (rollup === 'minute') return 'minute';
  if (rollup === 'hour') return 'hour';
  if (rollup === 'week') return 'week';
  if (rollup === 'day') return 'day';
  return undefined;
}

export function needsAnalyticsApi(rollup: ExploreRollup): boolean {
  return rollup === 'minute' || rollup === 'hour';
}

/**
 * Minute/hour queries stay on a tight window.
 * 3h → last 3 hours; Today → local midnight–now; else clamp to last 3h.
 */
export function analyticsTimeRange(
  timeframe: TimeframeId,
  now = new Date()
): { start: string; end: string; note: string | null } {
  const end = now.toISOString();

  if (timeframe === '3h') {
    const start = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return {
      start: start.toISOString(),
      end,
      note: null,
    };
  }

  if (timeframe === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
      start: start.toISOString(),
      end,
      note: null,
    };
  }

  const start = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end,
    note: 'Minute/hour rollup limited to the last 3 hours — switch Range to 3h.',
  };
}

export function parseAnalyticsNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function dateColumnForGranularity(
  granularity: NonNullable<AnalyticsQueryBody['granularity']>
): string {
  return `date__${granularity}`;
}

export type AnalyticsSeriesPoint = {
  bucket: string;
  value: number;
  label: string;
};

export function rowsToTimeSeries(
  rows: Record<string, string | number | null>[],
  metricId: string,
  granularity: NonNullable<AnalyticsQueryBody['granularity']>
): AnalyticsSeriesPoint[] {
  const dateCol = dateColumnForGranularity(granularity);
  const map = new Map<string, number>();

  for (const row of rows) {
    const bucket = String(row[dateCol] ?? '');
    if (!bucket) continue;
    map.set(bucket, (map.get(bucket) ?? 0) + parseAnalyticsNumber(row[metricId]));
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, value]) => ({
      bucket,
      value,
      label: formatAnalyticsBucketLabel(bucket, granularity),
    }));
}

export function rowsToStackedSeries(
  rows: Record<string, string | number | null>[],
  metricId: string,
  dimension: string,
  granularity: NonNullable<AnalyticsQueryBody['granularity']>,
  topN = 5
): {
  buckets: string[];
  series: { key: string; values: number[] }[];
} {
  const dateCol = dateColumnForGranularity(granularity);
  const totals = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();
  const bucketSet = new Set<string>();

  for (const row of rows) {
    const bucket = String(row[dateCol] ?? '');
    const key = String(row[dimension] ?? 'unknown');
    if (!bucket) continue;
    const value = parseAnalyticsNumber(row[metricId]);
    bucketSet.add(bucket);
    totals.set(key, (totals.get(key) ?? 0) + value);
    if (!matrix.has(bucket)) matrix.set(bucket, new Map());
    const m = matrix.get(bucket)!;
    m.set(key, (m.get(key) ?? 0) + value);
  }

  const topKeys = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);
  const topSet = new Set(topKeys);
  const buckets = [...bucketSet].sort();

  const seriesKeys = [...topKeys];
  const hasOther = [...matrix.values()].some((m) =>
    [...m.keys()].some((k) => !topSet.has(k) && (m.get(k) ?? 0) > 0)
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

  return { buckets, series };
}

export function formatAnalyticsBucketLabel(
  bucket: string,
  granularity: NonNullable<AnalyticsQueryBody['granularity']>
): string {
  const d = new Date(bucket.includes('T') ? bucket : `${bucket}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return bucket;

  if (granularity === 'minute' || granularity === 'hour') {
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Floor a timestamp to the granularity bucket start (UTC ms). */
export function bucketStartMs(
  isoOrMs: string | number,
  granularity: 'minute' | 'hour'
): number {
  const t = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(t)) return NaN;
  const step = granularity === 'minute' ? 60_000 : 3_600_000;
  return Math.floor(t / step) * step;
}

/**
 * OpenRouter only returns buckets with activity. Pad zeros across the window
 * so a 3h minute chart shows the full timeline (up to 180 points).
 */
export function fillTimeSeriesGaps(
  points: AnalyticsSeriesPoint[],
  granularity: NonNullable<AnalyticsQueryBody['granularity']>,
  startIso: string,
  endIso: string
): AnalyticsSeriesPoint[] {
  if (granularity !== 'minute' && granularity !== 'hour') return points;

  const step = granularity === 'minute' ? 60_000 : 3_600_000;
  const start = bucketStartMs(startIso, granularity);
  const end = bucketStartMs(endIso, granularity);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return points;
  }

  const byMs = new Map<number, number>();
  for (const p of points) {
    const ms = bucketStartMs(p.bucket, granularity);
    if (!Number.isFinite(ms)) continue;
    byMs.set(ms, (byMs.get(ms) ?? 0) + p.value);
  }

  const filled: AnalyticsSeriesPoint[] = [];
  for (let t = start; t <= end; t += step) {
    const iso = new Date(t).toISOString();
    filled.push({
      bucket: iso,
      value: byMs.get(t) ?? 0,
      label: formatAnalyticsBucketLabel(iso, granularity),
    });
  }
  return filled;
}

/** Zero-fill stacked series buckets across the full window. */
export function fillStackedGaps(
  data: { buckets: string[]; series: { key: string; values: number[] }[] },
  granularity: NonNullable<AnalyticsQueryBody['granularity']>,
  startIso: string,
  endIso: string
): { buckets: string[]; series: { key: string; values: number[] }[] } {
  if (granularity !== 'minute' && granularity !== 'hour') return data;
  if (data.series.length === 0) {
    // Still emit empty timeline so UI can show the window
    const empty = fillTimeSeriesGaps([], granularity, startIso, endIso);
    return { buckets: empty.map((p) => p.bucket), series: [] };
  }

  const step = granularity === 'minute' ? 60_000 : 3_600_000;
  const start = bucketStartMs(startIso, granularity);
  const end = bucketStartMs(endIso, granularity);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return data;
  }

  const indexByMs = new Map<number, number>();
  data.buckets.forEach((b, i) => {
    const ms = bucketStartMs(b, granularity);
    if (Number.isFinite(ms)) indexByMs.set(ms, i);
  });

  const buckets: string[] = [];
  const series = data.series.map((s) => ({ key: s.key, values: [] as number[] }));

  for (let t = start; t <= end; t += step) {
    buckets.push(new Date(t).toISOString());
    const srcIdx = indexByMs.get(t);
    data.series.forEach((s, si) => {
      series[si].values.push(srcIdx == null ? 0 : (s.values[srcIdx] ?? 0));
    });
  }

  return { buckets, series };
}
