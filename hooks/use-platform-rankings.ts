import { useQuery } from '@tanstack/react-query';

import {
  buildRankingsSnapshot,
  type PlatformRankingRow,
  type PlatformRankingsSnapshot,
} from '@/lib/platform/rankings';
import { getSupabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config/env';

async function fetchPlatformRankings(): Promise<PlatformRankingsSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: metaRow } = await supabase
    .from('platform_meta')
    .select('value, updated_at')
    .eq('key', 'rankings_daily')
    .maybeSingle();

  const latestDate =
    (metaRow?.value as { latest_date?: string } | null)?.latest_date ?? null;

  // Pull ~14 days for volume trend; still cheap (top-50 + other per day)
  let startDate: string | null = null;
  if (latestDate) {
    const d = new Date(`${latestDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 13);
    startDate = d.toISOString().slice(0, 10);
  }

  let query = supabase
    .from('platform_rankings')
    .select(
      'ranking_date, model_permaslug, total_tokens, prompt_tokens, completion_tokens, is_other'
    )
    .order('ranking_date', { ascending: true })
    .order('total_tokens', { ascending: false })
    .limit(800);

  if (startDate && latestDate) {
    query = query.gte('ranking_date', startDate).lte('ranking_date', latestDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as PlatformRankingRow[];
  const syncedAt = (metaRow?.updated_at as string | undefined) ?? null;
  return buildRankingsSnapshot(rows, syncedAt);
}

export function usePlatformRankings() {
  return useQuery({
    queryKey: ['platform', 'rankings-daily', 'v2'],
    queryFn: fetchPlatformRankings,
    enabled: isSupabaseConfigured(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
