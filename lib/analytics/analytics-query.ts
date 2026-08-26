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

/**
 * Window rules (Analytics API):
 * - minute: max ~3h (OpenRouter constraint)
 * - hour + 7d/30d: full selected multi-day window (7d is ideal)
 * - today: local midnight → now
 * - 3h: last 3 hours
 */
export function analyticsTimeRange(
  timeframe: TimeframeId,
  granularity: NonNullable<AnalyticsQueryBody['granularity']> = 'minute',
  now = new Date()
): { start: string; end: string; note: string | null } {
  const end = now.toISOString();

  if (timeframe === '3h') {
    return {
      start: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      end,
      note: null,
    };
  }

  if (timeframe === 'today') {
    if (granularity === 'minute') {
      // Minute max window is ~3h — clamp Today to last 3h for minute rollup.
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const start = threeHoursAgo > dayStart ? threeHoursAgo : dayStart;
      return {
        start: start.toISOString(),
        end,
        note:
          threeHoursAgo > dayStart
            ? 'Minute rollup capped at last 3 hours (Analytics API limit).'
            : null,
      };
    }
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      end,
      note: null,
    };
  }

  if (granularity === 'hour') {
    if (timeframe === '7d') {
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end,
        note: null,
      };
    }
    if (timeframe === '30d') {
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end,
        note: null,
      };
    }
  }

  // Minute on 7d/30d → clamp to 3h
  return {
    start: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    end,
    note: 'Minute rollup limited to last 3 hours — use Range 3h, or Hour rollup for 7d.',
  };
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
  const dateCol = findAnalyticsTimeColumn(rows[0], granularity);

  for (const row of rows) {
    const col = dateCol ?? findAnalyticsTimeColumn(row, granularity);
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
} {
  const totals = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();
  const bucketSet = new Set<string>();
  const dateCol = findAnalyticsTimeColumn(rows[0], granularity);

  for (const row of rows) {
    const col = dateCol ?? findAnalyticsTimeColumn(row, granularity);
    if (!col) continue;
    const parsed = parseAnalyticsTimestamp(row[col]);
    if (!parsed) continue;
    const bucket = parsed.toISOString();
    const key = String(row[dimension] ?? 'unknown');
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
  data: { buckets: string[]; series: { key: string; values: number[] }[] },
  granularity: NonNullable<AnalyticsQueryBody['granularity']>,
  startIso: string,
  endIso: string
): { buckets: string[]; series: { key: string; values: number[] }[] } {
  if (granularity !== 'minute' && granularity !== 'hour') return data;
  if (data.series.length === 0) {
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
  return rows.reduce(
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
    {
      spend: 0,
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      byokSpend: 0,
    }
  );
}
