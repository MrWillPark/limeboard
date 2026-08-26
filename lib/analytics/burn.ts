import type { ActivityItem, CreditsInfo, KeyInfo, ManagedKey } from '@/lib/openrouter/types';

import {
  filterActivityByTimeframe,
  periodDayCount,
  type TimeframeId,
} from '@/lib/analytics/timeframe';

export type BurnSnapshot = {
  /** Account-wide remaining credits from GET /credits */
  accountBalance: number | null;
  totalCredits: number | null;
  lifetimeUsage: number | null;
  /** Connected session key limit (not account balance) */
  sessionLimit: number | null;
  sessionLimitRemaining: number | null;
  sessionUsageDaily: number;
  sessionUsageWeekly: number;
  sessionUsageMonthly: number;
  /** Account-wide spend from activity in selected window */
  periodSpend: number;
  periodRequests: number;
  periodPromptTokens: number;
  periodCompletionTokens: number;
  avgDailySpend: number;
  projectedZeroDate: Date | null;
  daysRemaining: number | null;
  runwayLabel: string;
};

export function computeAccountBalance(credits: CreditsInfo | undefined): {
  balance: number | null;
  totalCredits: number | null;
  lifetimeUsage: number | null;
} {
  if (!credits) {
    return { balance: null, totalCredits: null, lifetimeUsage: null };
  }
  return {
    balance: Math.max(0, credits.total_credits - credits.total_usage),
    totalCredits: credits.total_credits,
    lifetimeUsage: credits.total_usage,
  };
}

export function computeBurn(
  key: KeyInfo | undefined,
  credits: CreditsInfo | undefined,
  activity: ActivityItem[],
  timeframe: TimeframeId = '30d'
): BurnSnapshot {
  const account = computeAccountBalance(credits);
  const windowActivity = filterActivityByTimeframe(activity, timeframe);

  let periodSpend = 0;
  let periodRequests = 0;
  let periodPromptTokens = 0;
  let periodCompletionTokens = 0;

  for (const row of windowActivity) {
    periodSpend += row.usage;
    periodRequests += row.requests;
    periodPromptTokens += row.prompt_tokens;
    periodCompletionTokens += row.completion_tokens;
  }

  const days = periodDayCount(timeframe, activity);
  const avgDailySpend = days > 0 ? periodSpend / days : 0;

  // Prefer activity-derived burn for runway when we have history
  const velocity =
    windowActivity.length > 0 && avgDailySpend > 0
      ? avgDailySpend
      : (key?.usage_daily ?? 0);

  let projectedZeroDate: Date | null = null;
  let daysRemaining: number | null = null;

  if (account.balance != null && velocity > 0) {
    daysRemaining = account.balance / velocity;
    projectedZeroDate = new Date();
    projectedZeroDate.setUTCDate(
      projectedZeroDate.getUTCDate() + Math.floor(daysRemaining)
    );
  }

  let runwayLabel = '—';
  if (account.balance == null) {
    runwayLabel = 'Connect key for account balance';
  } else if (velocity <= 0) {
    runwayLabel = 'No recent burn in window';
  } else if (daysRemaining != null && daysRemaining < 1) {
    runwayLabel = 'Under 24h at current pace';
  } else if (daysRemaining != null) {
    runwayLabel = `~${Math.round(daysRemaining)} days at avg daily burn`;
  }

  return {
    accountBalance: account.balance,
    totalCredits: account.totalCredits,
    lifetimeUsage: account.lifetimeUsage,
    sessionLimit: key?.limit ?? null,
    sessionLimitRemaining: key?.limit_remaining ?? null,
    sessionUsageDaily: key?.usage_daily ?? 0,
    sessionUsageWeekly: key?.usage_weekly ?? 0,
    sessionUsageMonthly: key?.usage_monthly ?? 0,
    periodSpend,
    periodRequests,
    periodPromptTokens,
    periodCompletionTokens,
    avgDailySpend,
    projectedZeroDate,
    daysRemaining,
    runwayLabel,
  };
}

export type ModelSpendRow = {
  model: string;
  provider: string;
  usage: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  share: number;
};

export function aggregateByModel(activity: ActivityItem[]): ModelSpendRow[] {
  const map = new Map<string, ModelSpendRow>();
  let total = 0;

  for (const row of activity) {
    total += row.usage;
    const existing = map.get(row.model);
    if (existing) {
      existing.usage += row.usage;
      existing.promptTokens += row.prompt_tokens;
      existing.completionTokens += row.completion_tokens;
      existing.requests += row.requests;
    } else {
      map.set(row.model, {
        model: row.model,
        provider: row.provider_name,
        usage: row.usage,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        requests: row.requests,
        share: 0,
      });
    }
  }

  const rows = [...map.values()].sort((a, b) => b.usage - a.usage);
  for (const row of rows) {
    row.share = total > 0 ? row.usage / total : 0;
  }
  return rows;
}

export function dailySpendSeries(
  activity: ActivityItem[]
): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  for (const row of activity) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.usage);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export type FleetSnapshot = {
  totalKeys: number;
  activeKeys: number;
  topKeys: { name: string; usageDaily: number; usageMonthly: number }[];
};

export function computeFleetSnapshot(keys: ManagedKey[] | undefined): FleetSnapshot {
  const list = keys ?? [];
  const sorted = [...list].sort((a, b) => b.usage_daily - a.usage_daily);
  return {
    totalKeys: list.length,
    activeKeys: list.filter((k) => !k.disabled).length,
    topKeys: sorted.slice(0, 3).map((k) => ({
      name: k.name || k.label,
      usageDaily: k.usage_daily,
      usageMonthly: k.usage_monthly,
    })),
  };
}

export function formatUsd(amount: number | null | undefined, digits = 2): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  if (Math.abs(amount) >= 1000) {
    return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (Math.abs(amount) < 0.01 && amount !== 0) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(digits)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatShortDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatChartDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
