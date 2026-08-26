export type PlatformRankingRow = {
  ranking_date: string;
  model_permaslug: string;
  total_tokens: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  is_other: boolean;
};

export type PlatformRankingsSnapshot = {
  date: string;
  rows: PlatformRankingRow[];
  syncedAt: string | null;
  leaderShare: number;
  leaderModel: string;
  totalTokens: number;
};

export function shortModelSlug(slug: string): string {
  if (slug === 'other') return 'Other';
  const parts = slug.split('/');
  return parts[parts.length - 1] ?? slug;
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function buildRankingsSnapshot(
  rows: PlatformRankingRow[],
  syncedAt: string | null
): PlatformRankingsSnapshot | null {
  if (rows.length === 0) return null;

  const date = rows[0]!.ranking_date;
  const dayRows = rows.filter((r) => r.ranking_date === date && !r.is_other);
  const totalTokens =
    dayRows.reduce((s, r) => s + r.total_tokens, 0) +
    (rows.find((r) => r.ranking_date === date && r.is_other)?.total_tokens ?? 0);

  const sorted = [...dayRows].sort((a, b) => b.total_tokens - a.total_tokens);
  const leader = sorted[0];
  const leaderShare = leader && totalTokens > 0 ? leader.total_tokens / totalTokens : 0;

  return {
    date,
    rows: rows.filter((r) => r.ranking_date === date),
    syncedAt,
    leaderShare,
    leaderModel: leader ? shortModelSlug(leader.model_permaslug) : '—',
    totalTokens,
  };
}
