// Daily OpenRouter rankings sync for Platform Pulse (no-key Cockpit)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RankingItem = {
  date: string;
  model_permaslug: string;
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openRouterKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const url = new URL('https://openrouter.ai/api/v1/datasets/rankings-daily');
    url.searchParams.set('start_date', fmt(start));
    url.searchParams.set('end_date', fmt(end));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${openRouterKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: 'OpenRouter fetch failed', detail: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await res.json();
    const items: RankingItem[] = payload.data ?? [];

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const syncedAt = new Date().toISOString();

    const rows = items.map((item) => ({
      ranking_date: item.date,
      model_permaslug: item.model_permaslug,
      total_tokens: item.total_tokens ?? 0,
      prompt_tokens: item.prompt_tokens ?? null,
      completion_tokens: item.completion_tokens ?? null,
      is_other: item.model_permaslug === 'other',
      synced_at: syncedAt,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase.from('platform_rankings').upsert(rows, {
        onConflict: 'ranking_date,model_permaslug',
      });
      if (upsertError) throw upsertError;
    }

    const latestDate = rows.reduce<string | null>((max, row) => {
      if (!max || row.ranking_date > max) return row.ranking_date;
      return max;
    }, null);

    const { error: metaError } = await supabase.from('platform_meta').upsert({
      key: 'rankings_daily',
      value: {
        latest_date: latestDate,
        row_count: rows.length,
        synced_at: syncedAt,
      },
      updated_at: syncedAt,
    });
    if (metaError) throw metaError;

    return new Response(
      JSON.stringify({
        ok: true,
        rows: rows.length,
        latest_date: latestDate,
        synced_at: syncedAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
