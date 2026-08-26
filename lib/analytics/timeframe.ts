import type { ActivityItem } from '@/lib/openrouter/types';

/** Activity API covers the last ~30 completed UTC days (daily rows). */
export type TimeframeId = 'today' | '7d' | '30d';

export const TIMEFRAMES: { id: TimeframeId; label: string; short: string }[] = [
  { id: 'today', label: 'Today', short: '1d' },
  { id: '7d', label: '7 days', short: '7d' },
  { id: '30d', label: '30 days', short: '30d' },
];

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoUtc(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function filterActivityByTimeframe(
  activity: ActivityItem[],
  timeframe: TimeframeId
): ActivityItem[] {
  if (timeframe === '30d') return activity;

  const end = utcToday();
  const start = timeframe === 'today' ? end : daysAgoUtc(timeframe === '7d' ? 6 : 29);

  return activity.filter((row) => row.date >= start && row.date <= end);
}

export function timeframeLabel(timeframe: TimeframeId): string {
  return TIMEFRAMES.find((t) => t.id === timeframe)?.label ?? '30 days';
}

export function periodDayCount(timeframe: TimeframeId, activity: ActivityItem[]): number {
  const filtered = filterActivityByTimeframe(activity, timeframe);
  const dates = new Set(filtered.map((r) => r.date));
  if (dates.size > 0) return dates.size;
  if (timeframe === 'today') return 1;
  if (timeframe === '7d') return 7;
  return 30;
}
