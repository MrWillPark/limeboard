import type { ActivityItem } from '@/lib/openrouter/types';

export type ExploreMetric =
  | 'spend'
  | 'requests'
  | 'prompt_tokens'
  | 'completion_tokens'
  | 'reasoning_tokens'
  | 'byok_spend';

export type ExploreGroupBy = 'model' | 'provider';

export type ExploreChartType = 'line' | 'bar';

export type ExploreRollup = 'day' | 'week';

export const EXPLORE_METRICS: { id: ExploreMetric; label: string; short: string }[] = [
  { id: 'spend', label: 'Spend', short: 'USD' },
  { id: 'requests', label: 'Requests', short: 'req' },
  { id: 'prompt_tokens', label: 'Prompt tokens', short: 'in' },
  { id: 'completion_tokens', label: 'Completion tokens', short: 'out' },
  { id: 'reasoning_tokens', label: 'Reasoning tokens', short: 'think' },
  { id: 'byok_spend', label: 'BYOK spend', short: 'BYOK' },
];

export const EXPLORE_GROUPS: { id: ExploreGroupBy; label: string }[] = [
  { id: 'model', label: 'Model' },
  { id: 'provider', label: 'Provider' },
];

export function metricValue(row: ActivityItem, metric: ExploreMetric): number {
  switch (metric) {
    case 'spend':
      return row.usage;
    case 'requests':
      return row.requests;
    case 'prompt_tokens':
      return row.prompt_tokens;
    case 'completion_tokens':
      return row.completion_tokens;
    case 'reasoning_tokens':
      return row.reasoning_tokens;
    case 'byok_spend':
      return row.byok_usage_inference;
    default:
      return 0;
  }
}

export function groupKey(row: ActivityItem, groupBy: ExploreGroupBy): string {
  return groupBy === 'provider' ? row.provider_name : row.model;
}

function rollupDate(date: string, rollup: ExploreRollup): string {
  if (rollup === 'day') return date;
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export type RankedRow = {
  key: string;
  label: string;
  value: number;
  share: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  spend: number;
};

export function aggregateRanked(
  activity: ActivityItem[],
  metric: ExploreMetric,
  groupBy: ExploreGroupBy
): RankedRow[] {
  const map = new Map<string, RankedRow>();
  let total = 0;

  for (const row of activity) {
    const value = metricValue(row, metric);
    total += value;
    const key = groupKey(row, groupBy);
    const existing = map.get(key);
    if (existing) {
      existing.value += value;
      existing.promptTokens += row.prompt_tokens;
      existing.completionTokens += row.completion_tokens;
      existing.requests += row.requests;
      existing.spend += row.usage;
    } else {
      map.set(key, {
        key,
        label: key,
        value,
        share: 0,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        requests: row.requests,
        spend: row.usage,
      });
    }
  }

  const rows = [...map.values()].sort((a, b) => b.value - a.value);
  for (const row of rows) {
    row.share = total > 0 ? row.value / total : 0;
  }
  return rows;
}

export type TimePoint = { bucket: string; value: number };

export function aggregateTimeSeries(
  activity: ActivityItem[],
  metric: ExploreMetric,
  rollup: ExploreRollup
): TimePoint[] {
  const map = new Map<string, number>();
  for (const row of activity) {
    const bucket = rollupDate(row.date, rollup);
    map.set(bucket, (map.get(bucket) ?? 0) + metricValue(row, metric));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, value]) => ({ bucket, value }));
}

export type StackedSeries = {
  key: string;
  color: string;
  values: number[];
};

export type StackedTimeSeries = {
  buckets: string[];
  series: StackedSeries[];
  totals: number[];
};

export function aggregateStackedTimeSeries(
  activity: ActivityItem[],
  metric: ExploreMetric,
  groupBy: ExploreGroupBy,
  rollup: ExploreRollup,
  topN = 5
): StackedTimeSeries {
  const ranked = aggregateRanked(activity, metric, groupBy);
  const topKeys = new Set(ranked.slice(0, topN).map((r) => r.key));

  const bucketSet = new Set<string>();
  const matrix = new Map<string, Map<string, number>>();

  for (const row of activity) {
    const bucket = rollupDate(row.date, rollup);
    bucketSet.add(bucket);
    const key = groupKey(row, groupBy);
    const seriesKey = topKeys.has(key) ? key : '__other__';
    if (!matrix.has(bucket)) matrix.set(bucket, new Map());
    const rowMap = matrix.get(bucket)!;
    rowMap.set(seriesKey, (rowMap.get(seriesKey) ?? 0) + metricValue(row, metric));
  }

  const buckets = [...bucketSet].sort();
  const seriesKeys = [...topKeys];
  if ([...matrix.values()].some((m) => (m.get('__other__') ?? 0) > 0)) {
    seriesKeys.push('__other__');
  }

  const series: StackedSeries[] = seriesKeys.map((key) => ({
    key,
    color: '', // filled by UI
    values: buckets.map((b) => matrix.get(b)?.get(key) ?? 0),
  }));

  const totals = buckets.map((_, i) => series.reduce((s, ser) => s + ser.values[i], 0));

  return { buckets, series, totals };
}

export type OverviewTotals = {
  spend: number;
  byokSpend: number;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
};

export function computeOverview(activity: ActivityItem[]): OverviewTotals {
  return activity.reduce(
    (acc, row) => ({
      spend: acc.spend + row.usage,
      byokSpend: acc.byokSpend + row.byok_usage_inference,
      requests: acc.requests + row.requests,
      promptTokens: acc.promptTokens + row.prompt_tokens,
      completionTokens: acc.completionTokens + row.completion_tokens,
      reasoningTokens: acc.reasoningTokens + row.reasoning_tokens,
    }),
    {
      spend: 0,
      byokSpend: 0,
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
    }
  );
}

export function formatMetricValue(metric: ExploreMetric, value: number): string {
  if (metric === 'spend' || metric === 'byok_spend') {
    if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (value < 0.01 && value > 0) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(2)}`;
  }
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function formatBucketLabel(bucket: string, rollup: ExploreRollup): string {
  if (rollup === 'week') {
    const d = new Date(`${bucket}T00:00:00Z`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const d = new Date(`${bucket}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function shortModelName(model: string): string {
  const parts = model.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : model;
}
