import type { ActivityItem, KeyInfo, ManagedKey } from '@/lib/openrouter/types';

/**
 * Timeframe windows use the device local calendar unless noted.
 *
 * OpenRouter GET /activity returns daily rows keyed by UTC date and only
 * includes **completed** UTC days — the in-progress calendar day is absent.
 * "Today" spend therefore comes from live GET /key (usage_daily), not activity.
 */
export type TimeframeId = 'today' | '3h' | '7d' | '30d';

export const TIMEFRAMES: { id: TimeframeId; label: string; short: string }[] = [
  { id: 'today', label: 'Today', short: '1d' },
  { id: '3h', label: '3 hours', short: '3h' },
  { id: '7d', label: '7 days', short: '7d' },
  { id: '30d', label: '30 days', short: '30d' },
];

export function isIntradayTimeframe(timeframe: TimeframeId): boolean {
  return timeframe === 'today' || timeframe === '3h';
}
/** YYYY-MM-DD in the device local timezone. */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

export function localTimeLabel(date = new Date()): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Normalize OpenRouter activity `date` values to YYYY-MM-DD. */
export function normalizeDayKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** Chart / axis label for a UTC day key or OpenRouter activity date string. */
export function formatDayKeyLabel(raw: string | null | undefined): string {
  const key = normalizeDayKey(raw);
  if (!key) return '—';

  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type TimeframeDefinition = {
  id: TimeframeId;
  label: string;
  /** e.g. local midnight → now on this device */
  windowDescription: string;
  /** Whether GET /activity alone is sufficient for spend charts */
  activityCoversWindow: boolean;
  dataNote: string;
};

export function getTimeframeDefinition(timeframe: TimeframeId): TimeframeDefinition {
  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = localTimeLabel(now);

  if (timeframe === 'today') {
    return {
      id: 'today',
      label: 'Today',
      windowDescription: `${dateLabel}, 12:00 AM – ${timeLabel} (device local)`,
      activityCoversWindow: false,
      dataNote:
        'Spend is live from /key usage_daily. Activity charts omit the in-progress day (API is daily UTC buckets only).',
    };
  }

  if (timeframe === '3h') {
    const start = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return {
      id: '3h',
      label: '3 hours',
      windowDescription: `${localTimeLabel(start)} – ${timeLabel} (last 3h, device local)`,
      activityCoversWindow: false,
      dataNote:
        'Best with Minute rollup via Analytics API. Activity feed is daily-only and won’t resolve a 3-hour window.',
    };
  }

  if (timeframe === '7d') {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return {
      id: '7d',
      label: '7 days',
      windowDescription: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${dateLabel} (device local dates)`,
      activityCoversWindow: true,
      dataNote:
        'Matched to activity row dates (UTC day buckets). Today’s live spend may differ slightly from activity until the UTC day closes.',
    };
  }

  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    id: '30d',
    label: '30 days',
    windowDescription: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${dateLabel} (device local dates, API max ~30d)`,
    activityCoversWindow: true,
    dataNote:
      'Activity API returns at most ~30 completed UTC days. Rows are daily totals, not minute-level.',
  };
}

export function timeframeLabel(timeframe: TimeframeId): string {
  return TIMEFRAMES.find((t) => t.id === timeframe)?.label ?? '30 days';
}

/**
 * Filter activity rows to the local-calendar window.
 * Note: each row’s `date` is a UTC day label from OpenRouter — we align by
 * string comparison to local YYYY-MM-DD, which is approximate near timezones.
 */
export function filterActivityByTimeframe(
  activity: ActivityItem[],
  timeframe: TimeframeId
): ActivityItem[] {
  if (timeframe === '30d') {
    const start = localDaysAgo(29);
    const end = localDateString();
    return activity.filter((row) => {
      const day = normalizeDayKey(row.date);
      return day != null && day >= start && day <= end;
    });
  }

  if (timeframe === '7d') {
    const start = localDaysAgo(6);
    const end = localDateString();
    return activity.filter((row) => {
      const day = normalizeDayKey(row.date);
      return day != null && day >= start && day <= end;
    });
  }

  // Today / 3h: activity rarely includes the in-progress day; keep any row tagged local today.
  const today = localDateString();
  return activity.filter((row) => normalizeDayKey(row.date) === today);
}

export function periodDayCount(timeframe: TimeframeId, activity: ActivityItem[]): number {
  if (timeframe === 'today' || timeframe === '3h') return 1;

  const filtered = filterActivityByTimeframe(activity, timeframe);
  const dates = new Set(
    filtered.map((r) => normalizeDayKey(r.date)).filter((d): d is string => d != null)
  );
  if (dates.size > 0) return dates.size;
  if (timeframe === '7d') return 7;
  return 30;
}

/** Live spend for the current OpenRouter UTC day via /key or fleet keys. */
export function computeLiveTodaySpend(
  key: KeyInfo | undefined,
  fleetKeys: ManagedKey[] | undefined,
  isManagementKey: boolean
): { spend: number; source: 'fleet' | 'session_key' | 'none' } {
  return computeFleetPeriodSpend(key, fleetKeys, isManagementKey, 'today');
}

/**
 * Account spend from key counters — same fields as the Keys screen.
 * - today / 3h → Σ usage_daily (UTC day; 3h has no key counter)
 * - 7d → Σ usage_weekly (rolling 7d)
 * - 30d → Σ usage_monthly (OpenRouter month counter)
 */
export function computeFleetPeriodSpend(
  key: KeyInfo | undefined,
  fleetKeys: ManagedKey[] | undefined,
  isManagementKey: boolean,
  timeframe: TimeframeId
): {
  spend: number;
  source: 'fleet' | 'session_key' | 'none';
  field: 'usage_daily' | 'usage_weekly' | 'usage_monthly' | null;
} {
  const field =
    timeframe === 'today' || timeframe === '3h'
      ? ('usage_daily' as const)
      : timeframe === '7d'
        ? ('usage_weekly' as const)
        : timeframe === '30d'
          ? ('usage_monthly' as const)
          : null;

  if (!field) {
    return { spend: 0, source: 'none', field: null };
  }

  if (isManagementKey && fleetKeys && fleetKeys.length > 0) {
    return {
      spend: fleetKeys.reduce((sum, k) => sum + k[field], 0),
      source: 'fleet',
      field,
    };
  }
  if (key != null) {
    return { spend: key[field], source: 'session_key', field };
  }
  return { spend: 0, source: 'none', field };
}

export function fleetSpendLabel(timeframe: TimeframeId): string | null {
  if (timeframe === 'today' || timeframe === '3h') return 'Σ keys · usage_daily';
  if (timeframe === '7d') return 'Σ keys · usage_weekly (rolling 7d)';
  if (timeframe === '30d') return 'Σ keys · usage_monthly';
  return null;
}

export function localHoursElapsedToday(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max((now.getTime() - start.getTime()) / 3_600_000, 1 / 60);
}
