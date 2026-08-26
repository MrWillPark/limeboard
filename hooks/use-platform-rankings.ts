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

  let query = supabase
    .from('platform_rankings')
    .select(
      'ranking_date, model_permaslug, total_tokens, prompt_tokens, completion_tokens, is_other'
    )
    .order('total_tokens', { ascending: false })
    .limit(120);

  if (latestDate) {
    query = query.eq('ranking_date', latestDate);
  } else {
    query = query.order('ranking_date', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as PlatformRankingRow[];
  const syncedAt = (metaRow?.updated_at as string | undefined) ?? null;
  return buildRankingsSnapshot(rows, syncedAt);
}

export function usePlatformRankings() {
  return useQuery({
    queryKey: ['platform', 'rankings-daily'],
    queryFn: fetchPlatformRankings,
    enabled: isSupabaseConfigured(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
