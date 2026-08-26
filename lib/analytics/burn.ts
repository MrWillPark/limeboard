import type { ActivityItem, CreditsInfo, KeyInfo } from '@/lib/openrouter/types';

export type BurnSnapshot = {
  balance: number | null;
  dailyBurn: number;
  weeklyBurn: number;
  monthlyBurn: number;
  avgDailyFromActivity: number;
  projectedZeroDate: Date | null;
  daysRemaining: number | null;
  runwayLabel: string;
};

export function computeBurn(
  key: KeyInfo | undefined,
  credits: CreditsInfo | undefined,
  activity: ActivityItem[]
): BurnSnapshot {
  const balance =
    credits != null
      ? Math.max(0, credits.total_credits - credits.total_usage)
      : key?.limit_remaining ?? null;

  const dailyBurn = key?.usage_daily ?? 0;
  const weeklyBurn = key?.usage_weekly ?? 0;
  const monthlyBurn = key?.usage_monthly ?? 0;

  const byDate = new Map<string, number>();
  for (const row of activity) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.usage);
  }
  const dailyTotals = [...byDate.values()];
  const avgDailyFromActivity =
    dailyTotals.length > 0
      ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length
      : dailyBurn;

  const velocity = avgDailyFromActivity > 0 ? avgDailyFromActivity : dailyBurn;

  let projectedZeroDate: Date | null = null;
  let daysRemaining: number | null = null;

  if (balance != null && velocity > 0) {
    daysRemaining = balance / velocity;
    projectedZeroDate = new Date();
    projectedZeroDate.setUTCDate(projectedZeroDate.getUTCDate() + Math.floor(daysRemaining));
  }

  let runwayLabel = '—';
  if (balance == null) {
    runwayLabel = 'Connect a key to estimate runway';
  } else if (velocity <= 0) {
    runwayLabel = 'No recent burn';
  } else if (daysRemaining != null && daysRemaining < 1) {
    runwayLabel = 'Under 24h at current pace';
  } else if (daysRemaining != null) {
    runwayLabel = `~${Math.round(daysRemaining)} days remaining`;
  }

  return {
    balance,
    dailyBurn,
    weeklyBurn,
    monthlyBurn,
    avgDailyFromActivity,
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

export function dailySpendSeries(activity: ActivityItem[]): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  for (const row of activity) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.usage);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
