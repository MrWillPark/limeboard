import type { ExploreGroupBy, ExploreMetric, ExploreRollup } from '@/lib/analytics/explore';
import {
  timeframeWindowBounds,
  type TimeframeId,
} from '@/lib/analytics/timeframe';
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
      return 'byok_usage';
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

/** Rollups allowed for a timeframe — illegal combos are filtered in Explore UI. */
export function allowedRollupsForTimeframe(timeframe: TimeframeId): ExploreRollup[] {
  if (timeframe === '3h') return ['minute', 'hour'];
  if (timeframe === '7d' || timeframe === '30d') return ['hour', 'day', 'week'];
  // today
  return ['minute', 'hour', 'day', 'week'];
}

export function coerceRollupForTimeframe(
  timeframe: TimeframeId,
  rollup: ExploreRollup
): ExploreRollup {
  const allowed = allowedRollupsForTimeframe(timeframe);
  if (allowed.includes(rollup)) return rollup;
  return allowed[0]!;
}

/**
 * Window rules (Analytics API):
 * - minute: max ~3h (OpenRouter constraint); only today / 3h in UI
 * - hour / multi-day: shared local-midnight window from timeframeWindowBounds
 * - today: local midnight → now (minute clamped to last 3h)
 * - 3h: last 3 hours
 */
export function analyticsTimeRange(
  timeframe: TimeframeId,
  granularity: NonNullable<AnalyticsQueryBody['granularity']> = 'minute',
  now = new Date()
): { start: string; end: string; note: string | null } {
  const end = now.toISOString();
  const { start: windowStart, end: windowEnd } = timeframeWindowBounds(timeframe, now);

  if (timeframe === '3h') {
    return {
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      note: null,
    };
  }

  if (timeframe === 'today') {
    if (granularity === 'minute') {
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const start =
        threeHoursAgo.getTime() > windowStart.getTime() ? threeHoursAgo : windowStart;
      const clamped = start.getTime() > windowStart.getTime();
      return {
        start: start.toISOString(),
        end,
        note: clamped
          ? 'Minute rollup capped at last 3 hours (Analytics API limit).'
          : null,
      };
    }
    return {
      start: windowStart.toISOString(),
      end,
      note: null,
    };
  }

  // 7d / 30d
  if (granularity === 'hour' || granularity === 'day' || granularity === 'week') {
    return {
      start: windowStart.toISOString(),
      end,
      note:
        timeframe === '30d' && granularity === 'hour'
          ? '30d at hour granularity — stacked charts may chunk requests.'
          : null,
    };
  }

  // Defensive: minute on 7d/30d should be coerced away in UI
  return {
    start: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    end,
    note: 'Minute rollup limited to last 3 hours — use Range 3h, or Hour rollup for 7d.',
  };
}

/** Split a range into ~chunkMs windows for Analytics queries that risk truncation. */
export function chunkTimeRange(
  startIso: string,
  endIso: string,
  chunkMs: number
): { start: string; end: string }[] {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [{ start: startIso, end: endIso }];
  }

  const chunks: { start: string; end: string }[] = [];
  for (let t = startMs; t < endMs; t += chunkMs) {
    const chunkEnd = Math.min(t + chunkMs, endMs);
    chunks.push({
      start: new Date(t).toISOString(),
      end: new Date(chunkEnd).toISOString(),
    });
  }
  return chunks.length > 0 ? chunks : [{ start: startIso, end: endIso }];
}

export function parseAnalyticsNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** OpenRouter may use date__* or created_at__* depending on data source. */
export function findAnalyticsTimeColumn(
  row: Record<string, string | number | null> | undefined,
  granularity: NonNullable<AnalyticsQueryBody['granularity']>
): string | null {
  if (!row) return null;
  const preferred = [`date__${granularity}`, `created_at__${granularity}`, 'date', 'created_at'];
  for (const key of preferred) {
    if (key in row && row[key] != null && row[key] !== '') return key;
  }
  const fallback = Object.keys(row).find(
    (k) => k.startsWith('date__') || k.startsWith('created_at__')
  );
  return fallback ?? null;
}

/** Parse Analytics timestamps (ISO, "YYYY-MM-DD HH:MM:SS", or epoch). */
export function parseAnalyticsTimestamp(raw: string | number | null | undefined): Date | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(raw).trim();
  const spaced = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(s);
  if (spaced) {
    const d = new Date(`${spaced[1]}T${spaced[2]}Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dayOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (dayOnly) {
    const d = new Date(`${dayOnly[1]}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const map = new Map<string, number>();

  for (const row of rows) {
    const col = findAnalyticsTimeColumn(row, granularity);
    if (!col) continue;
    const parsed = parseAnalyticsTimestamp(row[col]);
    if (!parsed) continue;
    const bucket = parsed.toISOString();
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
  totals: number[];
} {
  const keyTotals = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();
  const bucketSet = new Set<string>();

  for (const row of rows) {
    const col = findAnalyticsTimeColumn(row, granularity);
    if (!col) continue;
    const parsed = parseAnalyticsTimestamp(row[col]);
    if (!parsed) continue;
    const bucket = parsed.toISOString();
    const key = String(row[dimension] ?? 'unknown');
    const value = parseAnalyticsNumber(row[metricId]);
    bucketSet.add(bucket);
    keyTotals.set(key, (keyTotals.get(key) ?? 0) + value);
    if (!matrix.has(bucket)) matrix.set(bucket, new Map());
    const m = matrix.get(bucket)!;
    m.set(key, (m.get(key) ?? 0) + value);
  }

  const topKeys = [...keyTotals.entries()]
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

  const totals = buckets.map((_, i) => series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));

  return { buckets, series, totals };
}

export function formatAnalyticsBucketLabel(
  bucket: string,
  granularity: NonNullable<AnalyticsQueryBody['granularity']>
): string {
  const d = parseAnalyticsTimestamp(bucket);
  if (!d) return String(bucket);

  if (granularity === 'minute' || granularity === 'hour') {
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: granularity === 'minute' ? '2-digit' : undefined,
    });
  }

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function bucketStartMs(
  isoOrMs: string | number,
  granularity: 'minute' | 'hour'
): number {
  const d =
    typeof isoOrMs === 'number'
      ? new Date(isoOrMs < 1e12 ? isoOrMs * 1000 : isoOrMs)
      : parseAnalyticsTimestamp(isoOrMs);
  if (!d) return NaN;
  const step = granularity === 'minute' ? 60_000 : 3_600_000;
  return Math.floor(d.getTime() / step) * step;
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

export function fillStackedGaps(
  data: { buckets: string[]; series: { key: string; values: number[] }[]; totals?: number[] },
  granularity: NonNullable<AnalyticsQueryBody['granularity']>,
  startIso: string,
  endIso: string
): { buckets: string[]; series: { key: string; values: number[] }[]; totals: number[] } {
  if (granularity !== 'minute' && granularity !== 'hour') {
    const totals =
      data.totals ??
      data.buckets.map((_, i) =>
        data.series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0)
      );
    return { buckets: data.buckets, series: data.series, totals };
  }
  if (data.series.length === 0) {
    const empty = fillTimeSeriesGaps([], granularity, startIso, endIso);
    return { buckets: empty.map((p) => p.bucket), series: [], totals: empty.map(() => 0) };
  }

  const step = granularity === 'minute' ? 60_000 : 3_600_000;
  const start = bucketStartMs(startIso, granularity);
  const end = bucketStartMs(endIso, granularity);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    const totals =
      data.totals ??
      data.buckets.map((_, i) =>
        data.series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0)
      );
    return { buckets: data.buckets, series: data.series, totals };
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

  const totals = buckets.map((_, i) => series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  return { buckets, series, totals };
}

export type AnalyticsOverviewTotals = {
  spend: number;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  byokSpend: number;
};

export function rowsToOverviewTotals(
  rows: Record<string, string | number | null>[]
): AnalyticsOverviewTotals {
  const initial: AnalyticsOverviewTotals = {
    spend: 0,
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    reasoningTokens: 0,
    byokSpend: 0,
  };
  return rows.reduce<AnalyticsOverviewTotals>(
    (acc, row) => ({
      spend: acc.spend + parseAnalyticsNumber(row.total_usage),
      requests: acc.requests + parseAnalyticsNumber(row.request_count),
      promptTokens: acc.promptTokens + parseAnalyticsNumber(row.tokens_prompt),
      completionTokens:
        acc.completionTokens + parseAnalyticsNumber(row.tokens_completion),
      reasoningTokens:
        acc.reasoningTokens + parseAnalyticsNumber(row.tokens_reasoning),
      byokSpend: acc.byokSpend + parseAnalyticsNumber(row.byok_usage),
    }),
    initial
  );
}

/** Sum of all series values — Chart Sum for stacked/bar view. */
export function stackedSeriesTotal(series: { values: number[] }[]): number {
  return series.reduce(
    (sum, s) => sum + s.values.reduce((a, b) => a + b, 0),
    0
  );
}
