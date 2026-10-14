// Authenticated: enable/disable Pro remote burn monitoring and store encrypted monitor key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { encryptSecret } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const encSecret = Deno.env.get('MONITOR_KEY_ENCRYPTION_SECRET');

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !encSecret) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      enabled?: boolean;
      monitorKey?: string;
    };

    const enabled = Boolean(body.enabled);
    const monitorKey = typeof body.monitorKey === 'string' ? body.monitorKey.trim() : '';

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (!enabled) {
      await admin.from('burn_alert_subscriptions').upsert(
        {
          user_id: user.id,
          enabled: false,
          monitor_key_ciphertext: null,
          last_usage_daily: null,
          last_sampled_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      await admin.from('burn_rate_samples').delete().eq('user_id', user.id);

      return new Response(JSON.stringify({ ok: true, enabled: false, hasMonitorKey: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await admin
      .from('burn_alert_subscriptions')
      .select('monitor_key_ciphertext')
      .eq('user_id', user.id)
      .maybeSingle();

    let ciphertext = existing?.monitor_key_ciphertext ?? null;

    if (monitorKey) {
      const probe = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${monitorKey}` },
      });
      if (!probe.ok) {
        return new Response(JSON.stringify({ error: 'OpenRouter rejected this monitor key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      ciphertext = await encryptSecret(monitorKey, encSecret);
    }

    if (!ciphertext) {
      return new Response(
        JSON.stringify({ error: 'A monitor key is required to enable remote alerts' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: upsertError } = await admin.from('burn_alert_subscriptions').upsert(
      {
        user_id: user.id,
        enabled: true,
        monitor_key_ciphertext: ciphertext,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, enabled: true, hasMonitorKey: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
