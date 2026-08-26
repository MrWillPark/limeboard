import {
  findAnalyticsTimeColumn,
  parseAnalyticsNumber,
  parseAnalyticsTimestamp,
} from '@/lib/analytics/analytics-query';
import { formatTokens, formatUsd } from '@/lib/analytics/burn';

export type BurnRateMode = 'tokens' | 'spend';

export type MinuteBucket = {
  at: number;
  tokens: number;
  requests: number;
};

export type BurnRateSnapshot = {
  mode: BurnRateMode;
  /** Primary needle value (tokens/s or USD/s). */
  currentPerSecond: number;
  peakPerSecond: number;
  avgPerSecond: number;
  /** Last N minute totals for the spark strip (newest last). */
  historyPerMinute: number[];
  lastUpdated: Date | null;
  sourceLabel: string;
  lagNote: string | null;
};

const ROLLING_MINUTES = 3;
const HISTORY_MINUTES = 30;
const SPEND_MIN_GAP_MS = 15_000;

type SpendSample = { at: number; spend: number };
let spendSamples: SpendSample[] = [];

/** Merge Analytics rows into per-minute token + request buckets. */
export function minuteBucketsFromAnalyticsRows(
  rows: Record<string, string | number | null>[]
): MinuteBucket[] {
  const map = new Map<number, MinuteBucket>();

  for (const row of rows) {
    const col = findAnalyticsTimeColumn(row, 'minute');
    if (!col) continue;
    const parsed = parseAnalyticsTimestamp(row[col]);
    if (!parsed) continue;
    const at = parsed.getTime();
    const prompt = parseAnalyticsNumber(row.tokens_prompt);
    const completion = parseAnalyticsNumber(row.tokens_completion);
    const requests = parseAnalyticsNumber(row.request_count);
    const existing = map.get(at);
    if (existing) {
      existing.tokens += prompt + completion;
      existing.requests += requests;
    } else {
      map.set(at, { at, tokens: prompt + completion, requests });
    }
  }

  return [...map.values()].sort((a, b) => a.at - b.at);
}

/** Drop the in-progress minute bucket (often partial). */
export function dropPartialMinuteBucket(
  buckets: MinuteBucket[],
  now = Date.now()
): MinuteBucket[] {
  if (buckets.length === 0) return buckets;
  const last = buckets[buckets.length - 1]!;
  if (now - last.at < 60_000) {
    return buckets.slice(0, -1);
  }
  return buckets;
}

export function computeTokenBurnRate(
  buckets: MinuteBucket[],
  now = Date.now()
): BurnRateSnapshot {
  const complete = dropPartialMinuteBucket(buckets, now);
  const recent = complete.slice(-HISTORY_MINUTES);
  const historyPerMinute = recent.map((b) => b.tokens);

  if (complete.length === 0) {
    return {
      mode: 'tokens',
      currentPerSecond: 0,
      peakPerSecond: 0,
      avgPerSecond: 0,
      historyPerMinute: [],
      lastUpdated: null,
      sourceLabel: 'Analytics · minute · 3h',
      lagNote: 'Waiting for minute buckets',
    };
  }

  const rolling = complete.slice(-ROLLING_MINUTES);
  const rollingTokens = rolling.reduce((s, b) => s + b.tokens, 0);
  const rollingSeconds = rolling.length * 60;
  const currentPerSecond = rollingSeconds > 0 ? rollingTokens / rollingSeconds : 0;

  const peakPerSecond = Math.max(...complete.map((b) => b.tokens / 60), 0);

  const window = complete.slice(-HISTORY_MINUTES);
  const windowTokens = window.reduce((s, b) => s + b.tokens, 0);
  const windowSeconds = window.length * 60;
  const avgPerSecond = windowSeconds > 0 ? windowTokens / windowSeconds : 0;

  const lastBucket = complete[complete.length - 1]!;

  return {
    mode: 'tokens',
    currentPerSecond,
    peakPerSecond,
    avgPerSecond,
    historyPerMinute,
    lastUpdated: new Date(lastBucket.at + 60_000),
    sourceLabel: 'Analytics · minute · 3h',
    lagNote:
      complete.length < ROLLING_MINUTES
        ? 'Warming up rolling average'
        : null,
  };
}

export function recordSpendRateSample(liveSpend: number, now = Date.now()) {
  const spend = Math.max(0, liveSpend);
  const last = spendSamples[spendSamples.length - 1];

  if (!last) {
    spendSamples = [{ at: now, spend }];
    return;
  }

  if (now - last.at < SPEND_MIN_GAP_MS) {
    last.spend = spend;
    last.at = now;
    return;
  }

  spendSamples.push({ at: now, spend });
  if (spendSamples.length > 48) {
    spendSamples = spendSamples.slice(-48);
  }
}

export function resetSpendRateSamplesForTests() {
  spendSamples = [];
}

export function computeSpendBurnRate(
  liveSpend: number,
  now = Date.now()
): BurnRateSnapshot {
  recordSpendRateSample(liveSpend, now);

  if (spendSamples.length < 2) {
    return {
      mode: 'spend',
      currentPerSecond: 0,
      peakPerSecond: 0,
      avgPerSecond: 0,
      historyPerMinute: [],
      lastUpdated: spendSamples[0] ? new Date(spendSamples[0].at) : null,
      sourceLabel: 'Live · /key usage_daily',
      lagNote: 'Need one more poll for rate',
    };
  }

  const ratesPerSecond: number[] = [];
  const historyPerMinute: number[] = [];

  for (let i = 1; i < spendSamples.length; i++) {
    const prev = spendSamples[i - 1]!;
    const cur = spendSamples[i]!;
    const dt = (cur.at - prev.at) / 1000;
    if (dt <= 0) continue;
    const delta = Math.max(0, cur.spend - prev.spend);
    const perSecond = delta / dt;
    ratesPerSecond.push(perSecond);
    historyPerMinute.push(perSecond * 60);
  }

  const recent = ratesPerSecond.slice(-ROLLING_MINUTES);
  const currentPerSecond =
    recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const peakPerSecond = ratesPerSecond.length > 0 ? Math.max(...ratesPerSecond) : 0;
  const avgPerSecond =
    ratesPerSecond.length > 0
      ? ratesPerSecond.reduce((a, b) => a + b, 0) / ratesPerSecond.length
      : 0;

  const last = spendSamples[spendSamples.length - 1]!;

  return {
    mode: 'spend',
    currentPerSecond,
    peakPerSecond,
    avgPerSecond,
    historyPerMinute: historyPerMinute.slice(-HISTORY_MINUTES),
    lastUpdated: new Date(last.at),
    sourceLabel: 'Live · /key usage_daily',
    lagNote: null,
  };
}

export function formatRatePerSecond(value: number, mode: BurnRateMode): string {
  if (!Number.isFinite(value) || value <= 0) return mode === 'tokens' ? '0 tok/s' : '$0/min';

  if (mode === 'spend') {
    const perMin = value * 60;
    if (perMin < 0.01) return `$${(perMin * 100).toFixed(2)}¢/min`;
    return `${formatUsd(perMin)}/min`;
  }

  if (value >= 1000) return `${(value / 1000).toFixed(1)}k tok/s`;
  if (value >= 10) return `${Math.round(value)} tok/s`;
  if (value >= 1) return `${value.toFixed(1)} tok/s`;
  return `${Math.round(value * 60)} tok/min`;
}

export function formatRatePerSecondCompact(value: number, mode: BurnRateMode): string {
  if (!Number.isFinite(value) || value <= 0) return mode === 'tokens' ? '0' : '$0';

  if (mode === 'spend') {
    const perMin = value * 60;
    if (perMin < 0.01) return `$${(perMin * 100).toFixed(1)}¢`;
    if (perMin >= 1000) return `$${(perMin / 1000).toFixed(1)}k`;
    return formatUsd(perMin, perMin >= 1 ? 2 : 3);
  }

  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 10) return String(Math.round(value));
  return String(Math.round(value * 60));
}

export function formatRateUnit(mode: BurnRateMode): string {
  return mode === 'tokens' ? 'tok/s' : '/min';
}

export function tokenGaugeMaxScale(current: number, peak: number): number {
  return Math.max(current * 1.35, peak * 1.15, 50);
}

export function spendGaugeMaxScale(current: number, peak: number): number {
  const perMin = Math.max(current, peak) * 60;
  return Math.max(perMin * 1.35, peak * 1.15 * 60, 0.05) / 60;
}

export function formatPeakAvg(value: number, mode: BurnRateMode): string {
  if (mode === 'spend') {
    return formatRatePerSecond(value, 'spend');
  }
  return formatRatePerSecond(value, 'tokens');
}

export function formatHistoryValue(value: number, mode: BurnRateMode): string {
  if (mode === 'tokens') return formatTokens(value);
  return formatUsd(value);
}
