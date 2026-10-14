// Batch burn-spike monitor — invoked by GitHub Actions cron (not pg_cron)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { decryptSecret } from '../_shared/crypto.ts';
import {
  SPEND_ANOMALY_CONFIG,
  evaluateVelocityAnomaly,
  shouldFireAnomalyAlert,
  type AnomalySample,
} from '../_shared/velocity-anomaly.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-monitor-cron-secret',
};

const MAX_SAMPLES_KEPT = 48;

type SubscriptionRow = {
  user_id: string;
  enabled: boolean;
  monitor_key_ciphertext: string | null;
  last_usage_daily: number | null;
  last_sampled_at: string | null;
  last_fired_at: string | null;
};

type PushTokenRow = {
  user_id: string;
  expo_push_token: string;
};

async function fetchUsageDaily(apiKey: string): Promise<number | null> {
  const res = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { usage_daily?: number } };
  const usage = json.data?.usage_daily;
  return typeof usage === 'number' && Number.isFinite(usage) ? usage : null;
}

async function sendExpoPush(token: string, title: string, body: string): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: 'default',
      data: { type: 'burn_spike', screen: 'cockpit' },
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const expected = Deno.env.get('MONITOR_CRON_SECRET');
    const provided =
      req.headers.get('x-monitor-cron-secret') ??
      req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encSecret = Deno.env.get('MONITOR_KEY_ENCRYPTION_SECRET');

    if (!supabaseUrl || !serviceRoleKey || !encSecret) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const { data: subs, error: subsError } = await admin
      .from('burn_alert_subscriptions')
      .select(
        'user_id, enabled, monitor_key_ciphertext, last_usage_daily, last_sampled_at, last_fired_at'
      )
      .eq('enabled', true)
      .not('monitor_key_ciphertext', 'is', null);

    if (subsError) throw subsError;

    const subscriptions = (subs ?? []) as SubscriptionRow[];
    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, checked: 0, fired: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = subscriptions.map((s) => s.user_id);
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('user_id, expo_push_token')
      .in('user_id', userIds);

    const tokenByUser = new Map(
      ((tokens ?? []) as PushTokenRow[]).map((t) => [t.user_id, t.expo_push_token])
    );

    let fired = 0;
    let checked = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        if (!sub.monitor_key_ciphertext) continue;
        const apiKey = await decryptSecret(sub.monitor_key_ciphertext, encSecret);
        const usageDaily = await fetchUsageDaily(apiKey);
        if (usageDaily == null) {
          errors.push(`${sub.user_id}: openrouter key fetch failed`);
          continue;
        }
        checked += 1;

        let perSecond = 0;
        if (
          sub.last_usage_daily != null &&
          sub.last_sampled_at != null &&
          usageDaily >= sub.last_usage_daily
        ) {
          const prevAt = new Date(sub.last_sampled_at).getTime();
          const dt = (now - prevAt) / 1000;
          if (dt > 0) {
            perSecond = Math.max(0, usageDaily - sub.last_usage_daily) / dt;
          }
        }

        await admin.from('burn_alert_subscriptions').update({
          last_usage_daily: usageDaily,
          last_sampled_at: nowIso,
          updated_at: nowIso,
        }).eq('user_id', sub.user_id);

        // Always record a sample so baseline fills even at zero burn.
        await admin.from('burn_rate_samples').upsert(
          { user_id: sub.user_id, at: nowIso, per_second: perSecond },
          { onConflict: 'user_id,at' }
        );

        const { data: sampleRows } = await admin
          .from('burn_rate_samples')
          .select('at, per_second')
          .eq('user_id', sub.user_id)
          .order('at', { ascending: false })
          .limit(MAX_SAMPLES_KEPT);

        const history: AnomalySample[] = ((sampleRows ?? []) as { at: string; per_second: number }[])
          .slice()
          .reverse()
          .map((r) => ({
            at: new Date(r.at).getTime(),
            perSecond: r.per_second,
          }));

        // Prune older samples
        if ((sampleRows?.length ?? 0) >= MAX_SAMPLES_KEPT) {
          const cutoff = history[0]?.at;
          if (cutoff != null) {
            await admin
              .from('burn_rate_samples')
              .delete()
              .eq('user_id', sub.user_id)
              .lt('at', new Date(cutoff).toISOString());
          }
        }

        const result = evaluateVelocityAnomaly(history, SPEND_ANOMALY_CONFIG);
        const lastFiredAt = sub.last_fired_at
          ? new Date(sub.last_fired_at).getTime()
          : null;

        if (
          shouldFireAnomalyAlert(
            result,
            lastFiredAt,
            now,
            SPEND_ANOMALY_CONFIG.cooldownMs
          ) &&
          result.reason
        ) {
          const token = tokenByUser.get(sub.user_id);
          if (token) {
            await sendExpoPush(token, 'Burn spike', result.reason);
            fired += 1;
          }
          await admin
            .from('burn_alert_subscriptions')
            .update({ last_fired_at: nowIso, updated_at: nowIso })
            .eq('user_id', sub.user_id);
        }
      } catch (e) {
        errors.push(`${sub.user_id}: ${String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked, fired, errors: errors.slice(0, 20) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
