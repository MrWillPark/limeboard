export type PlatformRankingRow = {
  ranking_date: string;
  model_permaslug: string;
  total_tokens: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  is_other: boolean;
};

export type PlatformModelRank = {
  slug: string;
  label: string;
  tokens: number;
  share: number;
};

export type PlatformVolumePoint = {
  date: string;
  tokens: number;
};

export type PlatformRankingsSnapshot = {
  date: string;
  rows: PlatformRankingRow[];
  syncedAt: string | null;
  leaderShare: number;
  leaderModel: string;
  totalTokens: number;
  /** Est. average tokens/sec for the latest UTC day */
  tokensPerSecond: number;
  topModels: PlatformModelRank[];
  volumeSeries: PlatformVolumePoint[];
  peakDayTokens: number;
};

export function shortModelSlug(slug: string): string {
  if (slug === 'other') return 'Other';
  const parts = slug.split('/');
  return parts[parts.length - 1] ?? slug;
}

export function formatTokenCount(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatTokensPerSecond(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function dayTotal(rows: PlatformRankingRow[], date: string): number {
  return rows
    .filter((r) => r.ranking_date === date)
    .reduce((s, r) => s + r.total_tokens, 0);
}

export function buildRankingsSnapshot(
  rows: PlatformRankingRow[],
  syncedAt: string | null
): PlatformRankingsSnapshot | null {
  if (rows.length === 0) return null;

  const dates = [...new Set(rows.map((r) => r.ranking_date))].sort();
  const date = dates[dates.length - 1]!;

  const dayRows = rows.filter((r) => r.ranking_date === date && !r.is_other);
  const otherTokens =
    rows.find((r) => r.ranking_date === date && r.is_other)?.total_tokens ?? 0;
  const totalTokens = dayRows.reduce((s, r) => s + r.total_tokens, 0) + otherTokens;

  const sorted = [...dayRows].sort((a, b) => b.total_tokens - a.total_tokens);
  const leader = sorted[0];
  const leaderShare = leader && totalTokens > 0 ? leader.total_tokens / totalTokens : 0;

  const topModels: PlatformModelRank[] = sorted.slice(0, 6).map((r) => ({
    slug: r.model_permaslug,
    label: shortModelSlug(r.model_permaslug),
    tokens: r.total_tokens,
    share: totalTokens > 0 ? r.total_tokens / totalTokens : 0,
  }));

  const volumeSeries: PlatformVolumePoint[] = dates.map((d) => ({
    date: d,
    tokens: dayTotal(rows, d),
  }));

  const peakDayTokens = Math.max(...volumeSeries.map((p) => p.tokens), totalTokens, 1);
  const tokensPerSecond = totalTokens / 86_400;

  return {
    date,
    rows: rows.filter((r) => r.ranking_date === date),
    syncedAt,
    leaderShare,
    leaderModel: leader ? shortModelSlug(leader.model_permaslug) : '—',
    totalTokens,
    tokensPerSecond,
    topModels,
    volumeSeries,
    peakDayTokens,
  };
}
